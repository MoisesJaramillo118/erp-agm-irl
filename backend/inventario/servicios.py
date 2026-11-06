"""Lógica de negocio del módulo de inventario (Sprint 2)."""
from django.db import transaction

from .models import ConteoFisico, DetalleConteo, MovimientoInventario, Producto


class ProductoNoPermitido(Exception):
    """Un usuario DEMO intentó mover o contar un producto real."""


def validar_demo(usuario, productos):
    """Los usuarios DEMO solo trabajan con productos DEMO: así los datos de prueba nunca tocan el stock real
    y ``borrar_demo`` siempre puede limpiarlos."""
    if usuario.es_demo and any(not p.es_demo for p in productos):
        raise ProductoNoPermitido(
            "Un usuario DEMO solo puede trabajar con productos DEMO, para no mezclar datos de prueba con los reales."
        )


@transaction.atomic
def registrar_ingreso(usuario, lineas):
    """Ingreso de mercadería (HU07): cada línea (producto, cantidad) sube el stock y deja un movimiento
    de entrada en el historial. Si una línea falla, no se registra ninguna."""
    validar_demo(usuario, [p for p, _ in lineas])
    # Orden fijo por producto para que dos ingresos simultáneos no se bloqueen entre sí.
    return [
        producto.actualizar_stock(cantidad, MovimientoInventario.Tipo.ENTRADA, usuario)
        for producto, cantidad in sorted(lineas, key=lambda linea: linea[0].pk)
    ]


@transaction.atomic
def registrar_conteo(usuario, lineas):
    """Conteo físico (HU08). Cada línea es (producto, stock_fisico).

    El ``stock_sistema`` lo pone el sistema: es el stock en almacén (``stock_actual``) en el momento de registrar,
    que incluye lo reservado por pedidos aún no preparados, porque esa mercadería sigue en el anaquel.
    El conteo no cambia el stock: solo lo compara."""
    validar_demo(usuario, [p for p, _ in lineas])
    ids = sorted(p.pk for p, _ in lineas)
    actuales = {p.pk: p for p in Producto.objects.select_for_update().filter(pk__in=ids).order_by("pk")}
    es_demo = usuario.es_demo or any(p.es_demo for p in actuales.values())
    conteo = ConteoFisico.objects.create(usuario=usuario, es_demo=es_demo)
    DetalleConteo.objects.bulk_create([
        DetalleConteo(conteo=conteo, producto=actuales[p.pk], stock_sistema=actuales[p.pk].stock_actual,
                      stock_fisico=fisico)
        for p, fisico in lineas
    ])
    return conteo
