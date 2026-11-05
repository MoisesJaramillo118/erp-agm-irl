"""Datos DEMO: creación y borrado.

Todo lo que se crea aquí lleva ``es_demo=True`` para que NUNCA se mezcle con datos reales
de la empresa. ``borrar_datos_demo()`` elimina únicamente lo marcado como DEMO.

Los precios, el stock, los clientes y las ventas son INVENTADOS.
"""
import os
import secrets
import string
from datetime import datetime, time, timedelta
from decimal import Decimal

import numpy as np
from django.db import transaction
from django.utils import timezone

from distribucion.models import Entrega
from inventario.models import (
    Categoria,
    ConteoFisico,
    DetalleConteo,
    MovimientoInventario,
    Producto,
)
from recomendaciones.models import Pronostico
from usuarios.models import Usuario
from ventas.models import Cliente, DetallePedido, Pedido

CATEGORIAS = ["Bolsas", "Vasos", "Platos", "Bandejas", "Otros"]

# (código, descripción, categoría, unidad, precio S/, demanda semanal base, stock mínimo)
# Los 20 productos de la muestra de la tesis. Precios y cantidades: inventados (DEMO).
PRODUCTOS = [
    ("DEMO-01", "Bolsa Alfa 10×15 ×90 und.", "Bolsas", "paquete", "3.80", 420, 300),
    ("DEMO-02", "Bolsa Alfa 8×12 ×90 und.", "Bolsas", "paquete", "3.20", 380, 270),
    ("DEMO-03", "Bolsa Alfa 7×10 ×90 und.", "Bolsas", "paquete", "2.70", 350, 250),
    ("DEMO-04", "Bolsa con asa 21×24", "Bolsas", "paquete", "9.50", 150, 110),
    ("DEMO-05", "Bolsa con asa 16×19", "Bolsas", "paquete", "7.80", 220, 160),
    ("DEMO-06", "Bolsa con asa 12×11", "Bolsas", "paquete", "5.20", 260, 180),
    ("DEMO-07", "Bolsa con asa 12×13", "Bolsas", "paquete", "5.60", 240, 170),
    ("DEMO-08", "Sanguchera 6×6 impresa", "Bolsas", "paquete", "4.40", 300, 210),
    ("DEMO-09", "Sanguchera 6×6 blanca", "Bolsas", "paquete", "3.90", 320, 230),
    ("DEMO-10", "Bolsa 12×17", "Bolsas", "paquete", "4.60", 280, 200),
    ("DEMO-11", "Vaso N.° 5.5", "Vasos", "paquete", "3.50", 500, 350),
    ("DEMO-12", "Vaso N.° 5", "Vasos", "paquete", "3.20", 460, 320),
    ("DEMO-13", "Vaso N.° 3", "Vasos", "paquete", "2.60", 400, 280),
    ("DEMO-14", "Vaso N.° 10 blanco", "Vasos", "paquete", "6.90", 180, 130),
    ("DEMO-15", "Plato con tapa", "Platos", "paquete", "8.50", 140, 100),
    ("DEMO-16", "Bandeja", "Bandejas", "paquete", "7.20", 160, 110),
    ("DEMO-17", "Plato hondo N.° 10", "Platos", "paquete", "5.80", 200, 140),
    ("DEMO-18", "Rollo en bolsa", "Otros", "rollo", "11.50", 90, 65),
    ("DEMO-19", "Plato N.° 26", "Platos", "paquete", "6.60", 170, 120),
    ("DEMO-20", "Plato N.° 22", "Platos", "paquete", "5.40", 210, 150),
]

# Productos cuyo stock inicial queda por debajo del mínimo, para que haya algo que recomendar.
PRODUCTOS_STOCK_BAJO = {"DEMO-04", "DEMO-11", "DEMO-16", "DEMO-12"}

# Clientes inventados. Los RUC no son reales.
CLIENTES = [
    ("Bodega DEMO San Juan", "20999999011", "San Juan de Lurigancho", "intermedio"),
    ("Distribuidora DEMO Comas", "20999999022", "Comas", "intermedio"),
    ("Minimarket DEMO Ate", "20999999033", "Ate", "intermedio"),
    ("Bodega DEMO Villa El Salvador", "20999999044", "Villa El Salvador", "intermedio"),
    ("Distribuidora DEMO Los Olivos", "20999999055", "Los Olivos", "intermedio"),
    ("Juan Pérez DEMO", "99999901", "San Martín de Porres", "final"),
    ("Restaurante DEMO Surco", "20999999066", "Santiago de Surco", "intermedio"),
    ("María Quispe DEMO", "99999902", "La Victoria", "final"),
]

# Estacionalidad: más ventas en julio y diciembre.
ESTACIONALIDAD = {1: 0.90, 2: 0.90, 3: 1.00, 4: 1.00, 5: 1.00, 6: 1.05,
                  7: 1.45, 8: 1.00, 9: 0.95, 10: 1.00, 11: 1.10, 12: 1.60}

USUARIOS_DEMO = [
    ("demo_gerente", "Gerente", "DEMO", Usuario.Rol.GERENTE),
    ("demo_vendedor", "Vendedor", "DEMO", Usuario.Rol.VENDEDOR),
    ("demo_almacenero", "Almacenero", "DEMO", Usuario.Rol.ALMACENERO),
    ("demo_repartidor", "Repartidor", "DEMO", Usuario.Rol.REPARTIDOR),
]


def hay_datos_demo():
    return Producto.objects.filter(es_demo=True).exists() or Usuario.objects.filter(es_demo=True).exists()


def crear_pedido(cliente, vendedor, items, es_demo=False, hora_registro=None):
    """Crea un pedido con sus detalles (pares producto, cantidad) y calcula su total.
    La hora de registro la pone el sistema; ``hora_registro`` solo se usa para sembrar datos pasados."""
    pedido = Pedido(cliente=cliente, vendedor=vendedor, es_demo=es_demo)
    if hora_registro is not None:
        pedido.hora_registro = hora_registro
    pedido.save()
    DetallePedido.objects.bulk_create(
        [DetallePedido(pedido=pedido, producto=p, cantidad=c, precio_unitario=p.precio) for p, c in items]
    )
    pedido.calcular_total()
    return pedido


def _contrasena_demo():
    contrasena = os.environ.get("DEMO_PASSWORD", "").strip()
    if contrasena:
        return contrasena, False
    alfabeto = string.ascii_letters + string.digits
    return "".join(secrets.choice(alfabeto) for _ in range(10)), True


def _ultimo_domingo(hoy):
    """Domingo de la última semana completa (la semana en curso no se cuenta)."""
    return hoy - timedelta(days=hoy.weekday() + 1)


def _a_hora_local(fecha, hora, minuto=0):
    return timezone.make_aware(datetime.combine(fecha, time(hora, minuto)))


@transaction.atomic
def sembrar_datos_demo(semanas=104, semilla=2026, salida=print):
    """Crea categorías, 20 productos, clientes, usuarios por rol, historial sintético de ventas
    y algunos pedidos de ejemplo en distintos estados. Devuelve (usuarios, contraseña, generada)."""
    rng = np.random.default_rng(semilla)
    hoy = timezone.localdate()

    # --- Categorías (compartidas: no se marcan como DEMO) ---
    categorias = {n: Categoria.objects.get_or_create(nombre=n)[0] for n in CATEGORIAS}

    # --- Usuarios, uno por rol ---
    contrasena, generada = _contrasena_demo()
    usuarios = {}
    for username, nombre, apellido, rol in USUARIOS_DEMO:
        u = Usuario(username=username, first_name=nombre, last_name=apellido, rol=rol, es_demo=True)
        u.set_password(contrasena)
        u.save()
        usuarios[rol] = u
    vendedor, almacenero = usuarios[Usuario.Rol.VENDEDOR], usuarios[Usuario.Rol.ALMACENERO]
    repartidor = usuarios[Usuario.Rol.REPARTIDOR]

    # --- Clientes ---
    clientes = [
        Cliente.objects.create(
            nombre=n, ruc_dni=doc, distrito=d, tipo=t, es_demo=True,
            telefono="999 000 000", direccion="Dirección DEMO 123",
        )
        for n, doc, d, t in CLIENTES
    ]

    # --- Productos con stock inicial, registrado como movimiento de entrada ---
    productos, base = [], {}
    for codigo, desc, cat, unidad, precio, demanda, minimo in PRODUCTOS:
        p = Producto.objects.create(
            codigo=codigo, descripcion=desc, categoria=categorias[cat], unidad=unidad,
            precio=Decimal(precio), stock_actual=0, stock_minimo=minimo, es_demo=True,
        )
        if codigo in PRODUCTOS_STOCK_BAJO:
            inicial = int(minimo * rng.uniform(0.25, 0.6))
        else:
            inicial = int(minimo * rng.uniform(1.4, 3.2))
        p.actualizar_stock(inicial, MovimientoInventario.Tipo.ENTRADA, almacenero)
        productos.append(p)
        base[p.pk] = demanda

    # --- Historial sintético: un pedido DEMO por día de reparto (lunes a sábado) ---
    fin = _ultimo_domingo(hoy)
    primer_lunes = fin - timedelta(days=7 * semanas - 1)
    tendencia = {p.pk: rng.uniform(-0.002, 0.004) for p in productos}
    pedidos, plan_detalles = [], []
    contador = 0
    for s in range(semanas):
        lunes = primer_lunes + timedelta(days=7 * s)
        factor_mes = ESTACIONALIDAD[lunes.month]
        # Demanda semanal de cada producto = base × estacionalidad × tendencia × ruido.
        semanal = {
            p.pk: max(0, int(round(base[p.pk] * factor_mes * (1 + tendencia[p.pk] * s)
                                   * rng.lognormal(0, 0.12))))
            for p in productos
        }
        # Se reparte la semana entre los 6 días de reparto.
        por_dia = {p.pk: rng.multinomial(semanal[p.pk], [1 / 6] * 6) for p in productos}
        for d in range(6):
            fecha = lunes + timedelta(days=d)
            lineas = [(p, int(por_dia[p.pk][d])) for p in productos if por_dia[p.pk][d] > 0]
            if not lineas:
                continue
            contador += 1
            registro = _a_hora_local(fecha, 9, int(rng.integers(0, 60)))
            pedidos.append(Pedido(
                numero=f"DH-{contador:06d}", cliente=clientes[int(rng.integers(len(clientes)))],
                vendedor=vendedor, hora_registro=registro,
                hora_conformidad=registro + timedelta(minutes=int(rng.integers(20, 90))),
                estado=Pedido.Estado.ENTREGADO, es_demo=True,
                total=sum(c * p.precio for p, c in lineas),
            ))
            plan_detalles.append(lineas)
    Pedido.objects.bulk_create(pedidos, batch_size=1000)
    detalles = [
        DetallePedido(pedido=ped, producto=p, cantidad=c, precio_unitario=p.precio)
        for ped, lineas in zip(pedidos, plan_detalles) for p, c in lineas
    ]
    DetallePedido.objects.bulk_create(detalles, batch_size=2000)
    salida(f"  Historial DEMO: {len(pedidos)} pedidos, {len(detalles)} líneas, {semanas} semanas.")

    # --- Pedidos de ejemplo para probar las pantallas ---
    def lineas(*idx):
        return [(productos[i], int(rng.integers(5, 21))) for i in idx]

    ahora = timezone.now()
    # Cuatro pedidos esperando en el almacén.
    for i, (cli, idx, dias) in enumerate([(0, (0, 10), 1), (1, (3, 4, 15), 1), (2, (7, 12), 2), (4, (17, 18), 3)]):
        ped = crear_pedido(clientes[cli], vendedor, lineas(*idx), es_demo=True,
                           hora_registro=ahora - timedelta(minutes=45 - 10 * i))
        Entrega.objects.create(pedido=ped, fecha_acordada=hoy + timedelta(days=dias))
    # Tres pedidos preparados, listos para repartir (uno con fecha vencida).
    for cli, idx, dias in [(3, (1, 2), -1), (5, (9, 13), 0), (6, (14, 16), 1)]:
        ped = crear_pedido(clientes[cli], vendedor, lineas(*idx), es_demo=True,
                           hora_registro=ahora - timedelta(minutes=90))
        Entrega.objects.create(pedido=ped, fecha_acordada=hoy + timedelta(days=dias))
        ped.confirmar_conformidad(almacenero)
    # Dos pedidos ya entregados: uno a tiempo y otro tarde.
    for cli, idx, acordada, real in [(7, (5, 6), -3, -3), (0, (8, 19), -4, -2)]:
        ped = crear_pedido(clientes[cli], vendedor, lineas(*idx), es_demo=True,
                           hora_registro=ahora - timedelta(days=4))
        ent = Entrega.objects.create(pedido=ped, fecha_acordada=hoy + timedelta(days=acordada))
        ped.confirmar_conformidad(almacenero)
        ent.registrar_entrega(repartidor=repartidor, conformidad_cliente=True,
                              fecha=hoy + timedelta(days=real))

    # --- Un conteo físico de ejemplo (2 diferencias de 20 → exactitud 90 %) ---
    conteo = ConteoFisico.objects.create(usuario=almacenero, es_demo=True)
    for i, p in enumerate(productos):
        p.refresh_from_db()
        fisico = p.stock_actual + (-3 if i == 2 else 5 if i == 11 else 0)
        DetalleConteo.objects.create(conteo=conteo, producto=p, stock_sistema=p.stock_actual, stock_fisico=fisico)

    return [u[0] for u in USUARIOS_DEMO], contrasena, generada


@transaction.atomic
def borrar_datos_demo():
    """Elimina TODO lo marcado como DEMO y nada más. Devuelve cuántos registros se borraron por modelo.
    Si algún dato real depende de uno DEMO, Django lo impide (ProtectedError) y no se borra nada."""
    borrados = {}

    def borrar(etiqueta, queryset):
        n, _ = queryset.delete()
        borrados[etiqueta] = n

    borrar("pronósticos (con factores y recomendaciones)", Pronostico.objects.filter(producto__es_demo=True))
    borrar("entregas", Entrega.objects.filter(pedido__es_demo=True))
    borrar("pedidos (con sus detalles)", Pedido.objects.filter(es_demo=True))
    borrar("conteos físicos (con sus detalles)", ConteoFisico.objects.filter(es_demo=True))
    borrar("movimientos de inventario", MovimientoInventario.objects.filter(producto__es_demo=True))
    borrar("productos", Producto.objects.filter(es_demo=True))
    borrar("clientes", Cliente.objects.filter(es_demo=True))
    borrar("usuarios", Usuario.objects.filter(es_demo=True))
    return borrados
