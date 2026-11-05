import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models, transaction
from django.db.models import F, Sum
from django.utils import timezone


class PedidoNoPendiente(Exception):
    """Se intentó confirmar un pedido que ya no está en el almacén."""


class Cliente(models.Model):
    class Tipo(models.TextChoices):
        INTERMEDIO = "intermedio", "Intermedio (bodega, distribuidora)"
        FINAL = "final", "Final"

    nombre = models.CharField(max_length=150, db_index=True)
    ruc_dni = models.CharField("RUC / DNI", max_length=11, unique=True)
    telefono = models.CharField("teléfono", max_length=20, blank=True)
    direccion = models.CharField("dirección", max_length=200, blank=True)
    distrito = models.CharField(max_length=80)
    tipo = models.CharField(max_length=12, choices=Tipo.choices, default=Tipo.INTERMEDIO)
    es_demo = models.BooleanField("dato DEMO", default=False, db_index=True)

    class Meta:
        verbose_name = "cliente"
        verbose_name_plural = "clientes"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.ruc_dni})"


class Pedido(models.Model):
    class Estado(models.TextChoices):
        EN_ALMACEN = "en_almacen", "En almacén"
        PREPARADO = "preparado", "Preparado"
        ENTREGADO = "entregado", "Entregado"

    numero = models.CharField("número", max_length=20, unique=True, editable=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="pedidos")
    vendedor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pedidos_registrados"
    )
    # Ambas horas las pone el sistema, nunca el usuario: con ellas se mide el tiempo de atención.
    hora_registro = models.DateTimeField("hora de registro", default=timezone.now, editable=False)
    hora_conformidad = models.DateTimeField("hora de conformidad", null=True, blank=True, editable=False)
    estado = models.CharField(max_length=12, choices=Estado.choices, default=Estado.EN_ALMACEN)
    total = models.DecimalField("total (S/)", max_digits=12, decimal_places=2, default=Decimal("0.00"))
    es_demo = models.BooleanField("dato DEMO", default=False, db_index=True)

    class Meta:
        verbose_name = "pedido"
        verbose_name_plural = "pedidos"
        ordering = ["hora_registro", "id"]

    def __str__(self):
        return self.numero or f"Pedido #{self.pk}"

    def save(self, *args, **kwargs):
        # El número se arma con el id: P-000001. Se guarda primero con uno provisional.
        if not self.numero:
            self.numero = f"TMP-{uuid.uuid4().hex[:14]}"
            super().save(*args, **kwargs)
            self.numero = f"{'D' if self.es_demo else 'P'}-{self.pk:06d}"
            super().save(update_fields=["numero"])
        else:
            super().save(*args, **kwargs)

    def calcular_total(self):
        """Suma cantidad × precio unitario de los detalles y guarda el total."""
        suma = self.detalles.aggregate(t=Sum(F("cantidad") * F("precio_unitario")))["t"]
        self.total = Decimal(suma or 0).quantize(Decimal("0.01"))
        self.save(update_fields=["total"])
        return self.total

    @transaction.atomic
    def confirmar_conformidad(self, usuario):
        """El almacén confirma el pedido preparado (HU06): baja el stock, crea los
        movimientos de salida y guarda la hora de conformidad (la pone el sistema)."""
        pedido = Pedido.objects.select_for_update().get(pk=self.pk)
        if pedido.estado != Pedido.Estado.EN_ALMACEN:
            raise PedidoNoPendiente(f"El pedido {pedido.numero} ya no está pendiente en el almacén.")
        # Se recorren los productos en orden fijo para evitar bloqueos cruzados entre pedidos.
        for detalle in pedido.detalles.select_related("producto").order_by("producto_id"):
            detalle.producto.actualizar_stock(detalle.cantidad, "salida", usuario)
        pedido.hora_conformidad = timezone.now()
        pedido.estado = Pedido.Estado.PREPARADO
        pedido.save(update_fields=["hora_conformidad", "estado"])
        self.hora_conformidad, self.estado = pedido.hora_conformidad, pedido.estado
        return self

    def tiempo_atencion(self):
        """Minutos entre el registro y la conformidad del almacén. None si aún no hay conformidad."""
        if not self.hora_conformidad:
            return None
        return round((self.hora_conformidad - self.hora_registro).total_seconds() / 60, 2)


class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="detalles")
    producto = models.ForeignKey(
        "inventario.Producto", on_delete=models.PROTECT, related_name="detalles_pedido"
    )
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField("precio unitario (S/)", max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "detalle de pedido"
        verbose_name_plural = "detalles de pedido"
        constraints = [
            models.UniqueConstraint(fields=["pedido", "producto"], name="unico_producto_por_pedido"),
            models.CheckConstraint(condition=models.Q(cantidad__gt=0), name="cantidad_positiva"),
        ]

    @property
    def subtotal(self):
        return (self.cantidad * self.precio_unitario).quantize(Decimal("0.01"))

    def __str__(self):
        return f"{self.cantidad} × {self.producto.codigo}"
