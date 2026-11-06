from rest_framework import serializers

from .models import Producto


class ProductoStockSerializer(serializers.ModelSerializer):
    """Stock de un producto tal como lo registra inventario (HU03).
    ``stock_disponible`` = stock_actual − ``stock_reservado`` (pedidos que siguen en el almacén)."""

    categoria = serializers.CharField(source="categoria.nombre", read_only=True)
    stock_reservado = serializers.IntegerField(source="reservado", read_only=True)
    stock_disponible = serializers.IntegerField(source="disponible", read_only=True)

    class Meta:
        model = Producto
        fields = ("id", "codigo", "descripcion", "categoria", "unidad", "precio", "stock_actual",
                  "stock_minimo", "stock_reservado", "stock_disponible", "es_demo")
        read_only_fields = fields
