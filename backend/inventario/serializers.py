from rest_framework import serializers

from .models import ConteoFisico, DetalleConteo, MovimientoInventario, Producto


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


def _sin_repetidos(lineas):
    ids = [linea["producto"].pk for linea in lineas]
    if len(ids) != len(set(ids)):
        raise serializers.ValidationError("Un producto aparece dos veces; junta las cantidades en una sola línea.")
    return lineas


# ---------- Movimientos e ingresos (HU06 y HU07) ----------

class MovimientoSerializer(serializers.ModelSerializer):
    """Una línea del historial de movimientos. En los ajustes la cantidad lleva signo."""

    codigo = serializers.CharField(source="producto.codigo", read_only=True)
    descripcion = serializers.CharField(source="producto.descripcion", read_only=True)
    unidad = serializers.CharField(source="producto.unidad", read_only=True)
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    usuario_nombre = serializers.CharField(source="usuario.nombre_completo", read_only=True)
    es_demo = serializers.BooleanField(source="producto.es_demo", read_only=True)

    class Meta:
        model = MovimientoInventario
        fields = ("id", "producto", "codigo", "descripcion", "unidad", "tipo", "tipo_display", "cantidad",
                  "usuario_nombre", "fecha_hora", "es_demo")
        read_only_fields = fields


class LineaIngresoSerializer(serializers.Serializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    cantidad = serializers.IntegerField(min_value=1, max_value=1_000_000)


class RegistrarIngresoSerializer(serializers.Serializer):
    """Lo que envía el almacenero (HU07). La fecha y hora y el usuario los pone el sistema."""

    detalles = LineaIngresoSerializer(many=True, allow_empty=False)

    def validate_detalles(self, lineas):
        return _sin_repetidos(lineas)


# ---------- Conteo físico (HU08) ----------

class DetalleConteoSerializer(serializers.ModelSerializer):
    codigo = serializers.CharField(source="producto.codigo", read_only=True)
    descripcion = serializers.CharField(source="producto.descripcion", read_only=True)
    unidad = serializers.CharField(source="producto.unidad", read_only=True)
    diferencia = serializers.IntegerField(read_only=True)
    coincide = serializers.BooleanField(read_only=True)

    class Meta:
        model = DetalleConteo
        fields = ("producto", "codigo", "descripcion", "unidad", "stock_sistema", "stock_fisico", "diferencia", "coincide")
        read_only_fields = fields


class ConteoSerializer(serializers.ModelSerializer):
    """Resumen de un conteo: la exactitud la calcula ``ConteoFisico.calcular_exactitud()`` (Fig. 11)."""

    usuario_nombre = serializers.CharField(source="usuario.nombre_completo", read_only=True)
    contados = serializers.SerializerMethodField()
    coinciden = serializers.SerializerMethodField()
    exactitud = serializers.SerializerMethodField()

    class Meta:
        model = ConteoFisico
        fields = ("id", "fecha", "usuario_nombre", "contados", "coinciden", "exactitud", "hora_ajuste", "es_demo")
        read_only_fields = fields

    def get_contados(self, conteo):
        return len(conteo.detalles.all())

    def get_coinciden(self, conteo):
        return sum(1 for d in conteo.detalles.all() if d.coincide)

    def get_exactitud(self, conteo):
        exactitud = conteo.calcular_exactitud()
        return None if exactitud is None else float(exactitud)


class ConteoDetalleSerializer(ConteoSerializer):
    detalles = serializers.SerializerMethodField()

    class Meta(ConteoSerializer.Meta):
        fields = ConteoSerializer.Meta.fields + ("detalles",)
        read_only_fields = fields

    def get_detalles(self, conteo):
        # Primero las diferencias más grandes, para que salten a la vista.
        detalles = sorted(conteo.detalles.all(), key=lambda d: (-abs(d.diferencia), d.producto.descripcion))
        return DetalleConteoSerializer(detalles, many=True).data


class LineaConteoSerializer(serializers.Serializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    stock_fisico = serializers.IntegerField(min_value=0, max_value=10_000_000)


class RegistrarConteoSerializer(serializers.Serializer):
    """Lo que envía el almacenero: solo lo que contó. El stock del sistema, la fecha y el usuario los pone
    el sistema."""

    detalles = LineaConteoSerializer(many=True, allow_empty=False)

    def validate_detalles(self, lineas):
        return _sin_repetidos(lineas)
