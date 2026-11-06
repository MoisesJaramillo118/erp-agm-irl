from django.db.models import Q
from rest_framework import viewsets

from usuarios.permissions import roles_permitidos

from .models import Producto
from .serializers import ProductoStockSerializer


class ProductoStockViewSet(viewsets.ReadOnlyModelViewSet):
    """Consulta de stock disponible (HU03). La usan ventas y el almacén; los números salen
    directamente de inventario, así que el vendedor ve lo mismo que registra el almacén.
    Búsqueda: ``?q=`` por código o descripción."""

    serializer_class = ProductoStockSerializer
    permission_classes = [roles_permitidos("vendedor", "almacenero")]

    def get_queryset(self):
        qs = Producto.objects.select_related("categoria").con_disponible().order_by("descripcion")
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(codigo__icontains=q) | Q(descripcion__icontains=q))
        return qs
