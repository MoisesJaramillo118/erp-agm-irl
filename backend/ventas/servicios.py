"""Lógica de negocio del módulo de ventas."""
from django.db import transaction

from distribucion.models import Entrega
from inventario.models import Producto

from .models import DetallePedido, Pedido


class StockNoAlcanza(Exception):
    """Alguna línea pide más de lo disponible. ``faltantes`` describe cada línea rechazada."""

    def __init__(self, faltantes):
        self.faltantes = faltantes
        super().__init__(" ".join(f["mensaje"] for f in faltantes))


def crear_pedido(cliente, vendedor, items, es_demo=False, hora_registro=None):
    """Crea un pedido con sus detalles (pares producto, cantidad) y calcula su total.
    No valida stock: lo usan ``registrar_pedido`` y la carga de datos DEMO.
    El precio unitario es el vigente del producto. ``hora_registro`` solo se usa para sembrar datos pasados."""
    pedido = Pedido(cliente=cliente, vendedor=vendedor, es_demo=es_demo)
    if hora_registro is not None:
        pedido.hora_registro = hora_registro
    pedido.save()
    DetallePedido.objects.bulk_create(
        [DetallePedido(pedido=pedido, producto=p, cantidad=c, precio_unitario=p.precio) for p, c in items]
    )
    pedido.calcular_total()
    return pedido


@transaction.atomic
def registrar_pedido(cliente, vendedor, lineas, fecha_acordada):
    """Registra el pedido del vendedor (HU04) y lo envía al almacén.

    - Reserva el stock: cada línea debe caber en el disponible (stock_actual − pedidos en almacén);
      si alguna no cabe, no se registra nada y se informa «Solo quedan N».
    - Crea la Entrega con la fecha acordada con el cliente.
    - Número, total y hora de registro los pone el sistema.
    """
    # Se bloquean los productos (en orden fijo) para que dos vendedores no reserven el mismo stock a la vez.
    ids = sorted({p.pk for p, _ in lineas})
    productos = {p.pk: p for p in Producto.objects.select_for_update().filter(pk__in=ids).order_by("pk")}

    faltantes = []
    for indice, (producto, cantidad) in enumerate(lineas):
        p = productos[producto.pk]
        disponible = max(p.consultar_stock(), 0)
        if cantidad > disponible:
            faltantes.append({
                "linea": indice,
                "producto": p.pk,
                "disponible": disponible,
                "mensaje": f"Solo quedan {disponible} de {p.descripcion}.",
            })
    if faltantes:
        raise StockNoAlcanza(faltantes)

    items = [(productos[p.pk], c) for p, c in lineas]
    # Lo que registra un usuario DEMO o con datos DEMO también es DEMO: nunca se mezcla con lo real.
    es_demo = vendedor.es_demo or cliente.es_demo or any(p.es_demo for p, _ in items)
    pedido = crear_pedido(cliente, vendedor, items, es_demo=es_demo)
    Entrega.objects.create(pedido=pedido, fecha_acordada=fecha_acordada)
    return pedido
