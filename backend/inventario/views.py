from django.db.models import F, Q
from rest_framework import viewsets

from usuarios.permissions import roles_permitidos

from .models import Producto
from .serializers import ProductoStockSerializer


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
        estado = self.request.query_params.get("estado")
        if estado == "sin_stock":
            qs = qs.filter(disponible__lte=0)
        elif estado == "bajo_minimo":
            qs = qs.filter(disponible__gt=0, disponible__lt=F("stock_minimo"))
        elif estado == "con_stock":
            qs = qs.filter(disponible__gt=0, disponible__gte=F("stock_minimo"))
        return qs
