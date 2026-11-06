from django.utils import timezone
from rest_framework import serializers

from inventario.models import Producto

from .models import Cliente, DetallePedido, Pedido


class ClienteSerializer(serializers.ModelSerializer):
    """Cliente con su distrito (HU02). RUC de 11 dígitos o DNI de 8."""

    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Cliente
        fields = ("id", "nombre", "ruc_dni", "telefono", "direccion", "distrito", "tipo", "tipo_display", "es_demo")
        read_only_fields = ("es_demo",)
        # La unicidad se valida abajo, con un mensaje claro.
        extra_kwargs = {"ruc_dni": {"validators": []}, "distrito": {"allow_blank": False}}

    def validate_nombre(self, valor):
        valor = " ".join(valor.split())
        if not valor:
            raise serializers.ValidationError("Escribe el nombre del cliente.")
        return valor

    def validate_ruc_dni(self, valor):
        valor = valor.strip()
        if not valor.isdigit() or len(valor) not in (8, 11):
            raise serializers.ValidationError("Debe ser un DNI de 8 dígitos o un RUC de 11 dígitos.")
        repetido = Cliente.objects.filter(ruc_dni=valor)
        if self.instance is not None:
            repetido = repetido.exclude(pk=self.instance.pk)
        if repetido.exists():
            raise serializers.ValidationError("Ya hay un cliente registrado con ese RUC/DNI.")
        return valor

    def validate_distrito(self, valor):
        return " ".join(valor.split())

    def create(self, datos):
        # Los clientes que registra un usuario DEMO también son DEMO.
        datos["es_demo"] = self.context["request"].user.es_demo
        return super().create(datos)


class DetallePedidoSerializer(serializers.ModelSerializer):
    codigo = serializers.CharField(source="producto.codigo", read_only=True)
    descripcion = serializers.CharField(source="producto.descripcion", read_only=True)
    unidad = serializers.CharField(source="producto.unidad", read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DetallePedido
        fields = ("producto", "codigo", "descripcion", "unidad", "cantidad", "precio_unitario", "subtotal")


class PedidoSerializer(serializers.ModelSerializer):
    """Lectura de un pedido. Número, horas y total los pone el sistema."""

    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    distrito = serializers.CharField(source="cliente.distrito", read_only=True)
    vendedor_nombre = serializers.CharField(source="vendedor.nombre_completo", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    # Los pedidos del historial no tienen Entrega: en ese caso se devuelve null.
    fecha_acordada = serializers.DateField(source="entrega.fecha_acordada", read_only=True, default=None)
    tiempo_atencion = serializers.FloatField(read_only=True)
    detalles = DetallePedidoSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = ("id", "numero", "cliente", "cliente_nombre", "distrito", "vendedor_nombre", "hora_registro",
                  "hora_conformidad", "tiempo_atencion", "estado", "estado_display", "total", "fecha_acordada",
                  "es_demo", "detalles")
        read_only_fields = fields


class LineaPedidoSerializer(serializers.Serializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    cantidad = serializers.IntegerField(min_value=1)


class RegistrarPedidoSerializer(serializers.Serializer):
    """Datos que envía el vendedor (HU04). No incluye número, total ni horas: los pone el sistema."""

    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    fecha_acordada = serializers.DateField()
    detalles = LineaPedidoSerializer(many=True, allow_empty=False)

    def validate_fecha_acordada(self, fecha):
        if fecha < timezone.localdate():
            raise serializers.ValidationError("La fecha acordada no puede ser anterior a hoy.")
        return fecha

    def validate_detalles(self, lineas):
        ids = [linea["producto"].pk for linea in lineas]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Un producto aparece dos veces; junta las cantidades en una sola línea.")
        return lineas
