from django.db.models import F, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import roles_permitidos
from ventas.models import Pedido, PedidoNoPendiente
from ventas.serializers import PedidoSerializer

from .models import Categoria, ConteoFisico, MovimientoInventario, Producto, StockInsuficiente
from .serializers import (ConteoDetalleSerializer, ConteoSerializer, MovimientoSerializer, ProductoStockSerializer,
                          RegistrarConteoSerializer, RegistrarIngresoSerializer)
from .servicios import (ConteoSinDiferencias, ConteoYaAjustado, ProductoNoPermitido, ajustar_conteo, registrar_conteo,
                        registrar_ingreso)

SOLO_ALMACEN = [roles_permitidos("almacenero")]


class ProductoStockViewSet(viewsets.ReadOnlyModelViewSet):
    """Consulta de stock disponible (HU03). La usan ventas y el almacén; los números salen
    directamente de inventario, así que el vendedor ve lo mismo que registra el almacén.

    - ``?q=``: busca por código o descripción.
    - ``?estado=``: ``sin_stock`` (disponible ≤ 0), ``bajo_minimo`` (0 < disponible < mínimo)
      o ``con_stock`` (disponible ≥ mínimo).
    """

    serializer_class = ProductoStockSerializer
    permission_classes = [roles_permitidos("vendedor", "almacenero")]

    def get_queryset(self):
        qs = Producto.objects.select_related("categoria").con_disponible().order_by("descripcion")
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(codigo__icontains=q) | Q(descripcion__icontains=q))
        categoria = self.request.query_params.get("categoria", "").strip()
        if categoria:
            qs = qs.filter(categoria__nombre__iexact=categoria)
        estado = self.request.query_params.get("estado")
        if estado == "sin_stock":
            qs = qs.filter(disponible__lte=0)
        elif estado == "bajo_minimo":
            qs = qs.filter(disponible__gt=0, disponible__lt=F("stock_minimo"))
        elif estado == "con_stock":
            qs = qs.filter(disponible__gt=0, disponible__gte=F("stock_minimo"))
        return qs


class CategoriaView(APIView):
    """Nombres de las categorías con productos (para cargar una categoría completa en el conteo físico)."""

    permission_classes = [roles_permitidos("vendedor", "almacenero")]

    def get(self, request):
        nombres = Categoria.objects.filter(productos__isnull=False).distinct().order_by("nombre")
        return Response([c.nombre for c in nombres])


class PedidoAlmacenViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Pedidos por preparar (HU05) y su conformidad (HU06).

    - ``GET /pedidos/``: los pedidos en almacén, en el orden en que se registraron. La pantalla la vuelve a
      pedir cada pocos segundos, así que un pedido nuevo aparece apenas el vendedor lo registra.
    - ``GET /pedidos/?conformes_hoy=1``: los que el almacén confirmó hoy (hora de Lima), el último primero.
    - ``POST /pedidos/{id}/confirmar/``: confirma el pedido preparado.
    """

    serializer_class = PedidoSerializer
    permission_classes = SOLO_ALMACEN

    def get_queryset(self):
        qs = (Pedido.objects.select_related("cliente", "vendedor", "entrega")
              .prefetch_related("detalles__producto"))
        if self.action != "list":
            return qs
        if self.request.query_params.get("conformes_hoy"):
            return qs.filter(estado=Pedido.Estado.PREPARADO,
                             hora_conformidad__date=timezone.localdate()).order_by("-hora_conformidad", "-id")
        return qs.filter(estado=Pedido.Estado.EN_ALMACEN).order_by("hora_registro", "id")

    @action(detail=True, methods=["post"])
    def confirmar(self, request, pk=None):
        """HU06: baja el stock en las cantidades del pedido, crea los movimientos de salida y guarda la hora de
        conformidad. La hora la pone el sistema: lo que envíe el usuario se ignora."""
        pedido = self.get_object()
        if request.user.es_demo and not pedido.es_demo:
            return Response({"detail": "Un usuario DEMO solo puede confirmar pedidos DEMO."},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            pedido.confirmar_conformidad(request.user)
        except PedidoNoPendiente as error:
            return Response({"detail": str(error)}, status=status.HTTP_409_CONFLICT)
        except StockInsuficiente as error:
            return Response({"detail": f"No alcanza el stock en almacén. {error} Revisa el conteo físico."},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(PedidoSerializer(self.get_queryset().get(pk=pedido.pk)).data)


class MovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    """Historial de movimientos de inventario (entradas, salidas y ajustes), el más reciente primero.
    Filtros: ``?tipo=entrada|salida|ajuste``, ``?producto=<id>`` y ``?q=`` (código o descripción)."""

    serializer_class = MovimientoSerializer
    permission_classes = SOLO_ALMACEN

    def get_queryset(self):
        qs = MovimientoInventario.objects.select_related("producto", "usuario").order_by("-fecha_hora", "-id")
        params = self.request.query_params
        if params.get("tipo") in MovimientoInventario.Tipo.values:
            qs = qs.filter(tipo=params["tipo"])
        if params.get("producto", "").isdigit():
            qs = qs.filter(producto_id=params["producto"])
        q = params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(producto__codigo__icontains=q) | Q(producto__descripcion__icontains=q))
        return qs


class IngresoView(APIView):
    """Ingreso de mercadería (HU07): ``POST {"detalles": [{"producto": id, "cantidad": n}, ...]}``.
    Sube el stock de cada producto y deja un movimiento de entrada por línea."""

    permission_classes = SOLO_ALMACEN

    def post(self, request):
        entrada = RegistrarIngresoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        lineas = [(linea["producto"], linea["cantidad"]) for linea in entrada.validated_data["detalles"]]
        try:
            movimientos = registrar_ingreso(request.user, lineas)
        except ProductoNoPermitido as error:
            return Response({"detail": str(error)}, status=status.HTTP_403_FORBIDDEN)
        ids = [m.pk for m in movimientos]
        guardados = MovimientoInventario.objects.select_related("producto", "usuario").filter(pk__in=ids)
        productos = Producto.objects.filter(pk__in=[m.producto_id for m in movimientos]).con_disponible()
        return Response({
            "movimientos": MovimientoSerializer(guardados, many=True).data,
            "productos": ProductoStockSerializer(productos.select_related("categoria"), many=True).data,
        }, status=status.HTTP_201_CREATED)


class ConteoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
                    viewsets.GenericViewSet):
    """Conteos físicos (HU08), el más reciente primero. Cada uno muestra la diferencia por producto y la
    exactitud = productos que coinciden / productos contados × 100."""

    permission_classes = SOLO_ALMACEN

    def get_queryset(self):
        return (ConteoFisico.objects.select_related("usuario")
                .prefetch_related("detalles__producto").order_by("-fecha", "-id"))

    def get_serializer_class(self):
        return ConteoSerializer if self.action == "list" else ConteoDetalleSerializer

    def create(self, request, *args, **kwargs):
        entrada = RegistrarConteoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        lineas = [(linea["producto"], linea["stock_fisico"]) for linea in entrada.validated_data["detalles"]]
        try:
            conteo = registrar_conteo(request.user, lineas)
        except ProductoNoPermitido as error:
            return Response({"detail": str(error)}, status=status.HTTP_403_FORBIDDEN)
        return Response(ConteoDetalleSerializer(self.get_queryset().get(pk=conteo.pk)).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def ajustar(self, request, pk=None):
        """«Ajustar el stock a lo contado»: un ajuste por producto con diferencia, una sola vez por conteo."""
        conteo = self.get_object()
        try:
            movimientos = ajustar_conteo(conteo, request.user)
        except ConteoYaAjustado as error:
            return Response({"detail": str(error)}, status=status.HTTP_409_CONFLICT)
        except ConteoSinDiferencias as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except ProductoNoPermitido as error:
            return Response({"detail": str(error)}, status=status.HTTP_403_FORBIDDEN)
        except StockInsuficiente as error:
            return Response({"detail": f"No se ajustó nada. {error}"}, status=status.HTTP_400_BAD_REQUEST)
        datos = ConteoDetalleSerializer(self.get_queryset().get(pk=conteo.pk)).data
        datos["movimientos"] = MovimientoSerializer(
            MovimientoInventario.objects.select_related("producto", "usuario").filter(pk__in=[m.pk for m in movimientos]),
            many=True).data
        return Response(datos)
