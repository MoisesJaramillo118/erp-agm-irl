from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from usuarios.models import Usuario
from usuarios.permissions import roles_permitidos

from .models import Cliente, Pedido
from .serializers import ClienteSerializer, PedidoSerializer, RegistrarPedidoSerializer
from .servicios import StockNoAlcanza, registrar_pedido


class ClienteViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin,
                     mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Registro y búsqueda de clientes (HU02). Búsqueda: ``?q=`` por nombre o RUC/DNI."""

    serializer_class = ClienteSerializer
    permission_classes = [roles_permitidos("vendedor")]

    def get_queryset(self):
        qs = Cliente.objects.order_by("nombre")
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(nombre__icontains=q) | Q(ruc_dni__startswith=q))
        return qs


class PedidoViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin,
                    viewsets.GenericViewSet):
    """Pedidos. El vendedor registra (HU04) y ve los suyos; el almacén y el gerente ven todos,
    en orden de llegada. Filtro: ``?estado=en_almacen``."""

    serializer_class = PedidoSerializer

    def get_permissions(self):
        if self.action == "create":
            return [roles_permitidos("vendedor")()]
        return [roles_permitidos("vendedor", "almacenero")()]

    def get_queryset(self):
        qs = (Pedido.objects.select_related("cliente", "vendedor", "entrega")
              .prefetch_related("detalles__producto").order_by("hora_registro", "id"))
        usuario = self.request.user
        if usuario.rol == Usuario.Rol.VENDEDOR:
            qs = qs.filter(vendedor=usuario)
        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def create(self, request, *args, **kwargs):
        entrada = RegistrarPedidoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        lineas = [(linea["producto"], linea["cantidad"]) for linea in datos["detalles"]]
        try:
            pedido = registrar_pedido(datos["cliente"], request.user, lineas, datos["fecha_acordada"])
        except StockNoAlcanza as error:
            return Response({"detail": str(error), "faltantes": error.faltantes}, status=status.HTTP_400_BAD_REQUEST)
        pedido = Pedido.objects.select_related("cliente", "vendedor", "entrega").get(pk=pedido.pk)
        return Response(PedidoSerializer(pedido).data, status=status.HTTP_201_CREATED)
