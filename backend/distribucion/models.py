from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


class Entrega(models.Model):
    pedido = models.OneToOneField("ventas.Pedido", on_delete=models.CASCADE, related_name="entrega")
    repartidor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="entregas",
    )
    fecha_acordada = models.DateField("fecha acordada con el cliente")
    fecha_entrega = models.DateField("fecha de entrega real", null=True, blank=True)
    conformidad_cliente = models.BooleanField("conformidad del cliente", default=False)

    class Meta:
        verbose_name = "entrega"
        verbose_name_plural = "entregas"
        ordering = ["fecha_acordada", "id"]

    def __str__(self):
        return f"Entrega de {self.pedido.numero}"

    def programar(self, fecha_acordada, repartidor=None):
        """Guarda la fecha acordada con el cliente (HU09)."""
        self.fecha_acordada = fecha_acordada
        if repartidor is not None:
            self.repartidor = repartidor
        self.save()
        return self

    @transaction.atomic
    def registrar_entrega(self, repartidor=None, conformidad_cliente=True, fecha=None):
        """El repartidor registra la entrega real y la conformidad del cliente (HU11).
        La fecha real la pone el sistema (hoy, hora de Lima) salvo que se indique otra."""
        self.fecha_entrega = fecha or timezone.localdate()
        self.conformidad_cliente = conformidad_cliente
        if repartidor is not None:
            self.repartidor = repartidor
        self.save()
        pedido = self.pedido
        pedido.estado = pedido.Estado.ENTREGADO
        pedido.save(update_fields=["estado"])
        return self

    def esta_a_tiempo(self):
        """True si se entregó en la fecha acordada o antes. None si aún no se entrega."""
        if self.fecha_entrega is None:
            return None
        return self.fecha_entrega <= self.fecha_acordada

    @property
    def vencida(self):
        """Entrega pendiente cuya fecha acordada ya pasó (se muestra como «Vencida», HU10)."""
        return self.fecha_entrega is None and self.fecha_acordada < timezone.localdate()
