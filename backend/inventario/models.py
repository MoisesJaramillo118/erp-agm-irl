from django.conf import settings
from django.db import models, transaction
from django.db.models import F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

# Estado del pedido que reserva stock (ventas.Pedido.Estado.EN_ALMACEN). Se usa el valor
# directamente para no importar ventas desde inventario.
ESTADO_QUE_RESERVA = "en_almacen"


class StockInsuficiente(Exception):
    """Se intentó sacar más mercadería de la que hay en el stock."""


class ProductoQuerySet(models.QuerySet):
    def con_disponible(self):
        """Agrega ``reservado`` (unidades en pedidos en almacén) y ``disponible`` (stock_actual − reservado)."""
        reservado = Coalesce(
            Sum("detalles_pedido__cantidad", filter=Q(detalles_pedido__pedido__estado=ESTADO_QUE_RESERVA)),
            0,
        )
        return self.annotate(reservado=reservado, disponible=F("stock_actual") - reservado)


class Categoria(models.Model):
    nombre = models.CharField(max_length=60, unique=True)

    class Meta:
        verbose_name = "categoría"
        verbose_name_plural = "categorías"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    codigo = models.CharField("código", max_length=30, unique=True)
    descripcion = models.CharField("descripción", max_length=200)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="productos")
    unidad = models.CharField(max_length=30, default="unidad")
    precio = models.DecimalField("precio (S/)", max_digits=10, decimal_places=2)
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=0)
    es_demo = models.BooleanField("dato DEMO", default=False, db_index=True)

    objects = ProductoQuerySet.as_manager()

    class Meta:
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["descripcion"]

    def __str__(self):
        return f"{self.codigo} · {self.descripcion}"

    def stock_reservado(self):
        """Unidades comprometidas en pedidos que siguen en el almacén (aún no descontadas)."""
        total = self.detalles_pedido.filter(pedido__estado=ESTADO_QUE_RESERVA).aggregate(t=Sum("cantidad"))["t"]
        return total or 0

    def consultar_stock(self):
        """Stock disponible = stock_actual − reservado por pedidos en almacén (HU03).
        stock_actual recién baja cuando el almacén confirma el pedido (HU06)."""
        return self.stock_actual - self.stock_reservado()

    @transaction.atomic
    def actualizar_stock(self, cantidad, tipo, usuario):
        """Cambia el stock y deja el movimiento en el historial.

        - ENTRADA: suma ``cantidad`` (positiva).
        - SALIDA: resta ``cantidad`` (positiva); falla si no alcanza.
        - AJUSTE: ``cantidad`` es la diferencia con signo (+ sube, − baja).
        Devuelve el MovimientoInventario creado.
        """
        if tipo not in MovimientoInventario.Tipo.values:
            raise ValueError(f"Tipo de movimiento no válido: {tipo}")
        if tipo != MovimientoInventario.Tipo.AJUSTE and cantidad <= 0:
            raise ValueError("La cantidad debe ser mayor que cero.")

        # Se bloquea la fila para que dos operaciones simultáneas no pisen el stock.
        actual = Producto.objects.select_for_update().get(pk=self.pk)
        if tipo == MovimientoInventario.Tipo.SALIDA:
            if cantidad > actual.stock_actual:
                raise StockInsuficiente(
                    f"{actual.descripcion}: stock {actual.stock_actual}, se piden {cantidad}."
                )
            nuevo = actual.stock_actual - cantidad
        else:
            nuevo = actual.stock_actual + cantidad
        if nuevo < 0:
            raise StockInsuficiente(f"{actual.descripcion}: el ajuste dejaría el stock en negativo.")

        actual.stock_actual = nuevo
        actual.save(update_fields=["stock_actual"])
        self.stock_actual = nuevo
        return MovimientoInventario.objects.create(
            producto=actual, usuario=usuario, tipo=tipo, cantidad=cantidad
        )


class MovimientoInventario(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = "entrada", "Entrada"
        SALIDA = "salida", "Salida"
        AJUSTE = "ajuste", "Ajuste"

    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name="movimientos")
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="movimientos"
    )
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    # En ajustes la cantidad lleva signo (+ sube, − baja); en entradas y salidas es positiva.
    cantidad = models.IntegerField()
    fecha_hora = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "movimiento de inventario"
        verbose_name_plural = "movimientos de inventario"
        ordering = ["-fecha_hora", "-id"]

    def __str__(self):
        return f"{self.get_tipo_display()} {self.cantidad} · {self.producto.codigo}"


class ConteoFisico(models.Model):
    fecha = models.DateField(default=timezone.localdate)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="conteos"
    )
    es_demo = models.BooleanField("dato DEMO", default=False, db_index=True)

    class Meta:
        verbose_name = "conteo físico"
        verbose_name_plural = "conteos físicos"
        ordering = ["-fecha", "-id"]

    def __str__(self):
        return f"Conteo del {self.fecha:%d/%m/%Y}"

    def calcular_exactitud(self):
        """Exactitud = productos que coinciden / productos contados × 100 (HU08).
        Devuelve None si el conteo no tiene productos."""
        detalles = list(self.detalles.all())
        if not detalles:
            return None
        coinciden = sum(1 for d in detalles if d.coincide)
        return round(coinciden / len(detalles) * 100, 2)


class DetalleConteo(models.Model):
    conteo = models.ForeignKey(ConteoFisico, on_delete=models.CASCADE, related_name="detalles")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name="detalles_conteo")
    stock_sistema = models.IntegerField()
    stock_fisico = models.IntegerField()

    class Meta:
        verbose_name = "detalle de conteo"
        verbose_name_plural = "detalles de conteo"
        constraints = [
            models.UniqueConstraint(fields=["conteo", "producto"], name="unico_producto_por_conteo")
        ]

    @property
    def diferencia(self):
        return self.stock_fisico - self.stock_sistema

    @property
    def coincide(self):
        return self.stock_fisico == self.stock_sistema

    def __str__(self):
        return f"{self.producto.codigo}: sistema {self.stock_sistema}, físico {self.stock_fisico}"
