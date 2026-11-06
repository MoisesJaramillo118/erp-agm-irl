"""HU06: el almacenero confirma el pedido preparado.
Criterio (Tabla V): al confirmar, el stock baja en las cantidades del pedido y se guarda la hora.
Además se crean los movimientos de salida (prompt del Sprint 2)."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from config.pruebas import api_como, crear_cliente, crear_producto, crear_usuario
from inventario.models import MovimientoInventario, Producto
from ventas.models import Pedido
from ventas.servicios import registrar_pedido


def url(pedido):
    return f"/api/inventario/pedidos/{pedido.pk}/confirmar/"


class HU06ConfirmarPedidoTest(TestCase):
    def setUp(self):
        self.vendedor = crear_usuario("vendedor")
        self.almacenero = crear_usuario("almacenero")
        self.almacen = api_como(self.almacenero)
        self.vaso = crear_producto("VAS-5", stock=100)
        self.bolsa = crear_producto("BOL-1", stock=40)
        self.pedido = registrar_pedido(crear_cliente(), self.vendedor, [(self.vaso, 30), (self.bolsa, 15)],
                                       timezone.localdate() + timedelta(days=1))

    def test_al_confirmar_baja_el_stock_se_crean_las_salidas_y_se_guarda_la_hora(self):
        antes = timezone.now()
        r = self.almacen.post(url(self.pedido))
        self.assertEqual(r.status_code, 200, r.data)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.estado, Pedido.Estado.PREPARADO)
        self.assertTrue(antes <= self.pedido.hora_conformidad <= timezone.now())
        self.assertEqual(r.data["estado"], "preparado")
        self.assertIsNotNone(r.data["hora_conformidad"])
        self.assertIsNotNone(r.data["tiempo_atencion"])
        # El stock baja en las cantidades del pedido.
        self.assertEqual(Producto.objects.get(pk=self.vaso.pk).stock_actual, 70)
        self.assertEqual(Producto.objects.get(pk=self.bolsa.pk).stock_actual, 25)
        # Una salida por producto, a nombre del almacenero.
        salidas = MovimientoInventario.objects.filter(tipo="salida").order_by("producto__codigo")
        self.assertEqual([(m.producto.codigo, m.cantidad, m.usuario) for m in salidas],
                         [("BOL-1", 15, self.almacenero), ("VAS-5", 30, self.almacenero)])

    def test_el_disponible_no_cambia_porque_la_reserva_pasa_a_ser_descuento(self):
        disponible_antes = Producto.objects.get(pk=self.vaso.pk).consultar_stock()
        self.assertEqual(disponible_antes, 70)  # 100 en almacén − 30 reservadas
        self.almacen.post(url(self.pedido))
        vaso = Producto.objects.get(pk=self.vaso.pk)
        self.assertEqual(vaso.stock_reservado(), 0)
        self.assertEqual(vaso.consultar_stock(), disponible_antes)

    def test_la_hora_de_conformidad_la_pone_el_sistema(self):
        ayer = (timezone.now() - timedelta(days=1)).isoformat()
        self.almacen.post(url(self.pedido), {"hora_conformidad": ayer}, format="json")
        self.pedido.refresh_from_db()
        self.assertGreater(self.pedido.hora_conformidad, timezone.now() - timedelta(minutes=1))

    def test_no_se_puede_confirmar_dos_veces(self):
        self.assertEqual(self.almacen.post(url(self.pedido)).status_code, 200)
        r = self.almacen.post(url(self.pedido))
        self.assertEqual(r.status_code, 409)
        self.assertIn("ya no está pendiente", r.data["detail"])
        self.assertEqual(Producto.objects.get(pk=self.vaso.pk).stock_actual, 70)
        self.assertEqual(MovimientoInventario.objects.filter(tipo="salida").count(), 2)

    def test_si_falta_stock_en_almacen_no_se_confirma_nada(self):
        # Por ejemplo, alguien sacó mercadería sin registrarla: el almacén tiene menos de lo reservado.
        Producto.objects.filter(pk=self.bolsa.pk).update(stock_actual=10)
        r = self.almacen.post(url(self.pedido))
        self.assertEqual(r.status_code, 400)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.estado, Pedido.Estado.EN_ALMACEN)
        self.assertIsNone(self.pedido.hora_conformidad)
        self.assertEqual(Producto.objects.get(pk=self.vaso.pk).stock_actual, 100)
        self.assertFalse(MovimientoInventario.objects.filter(tipo="salida").exists())

    def test_solo_el_almacen_y_el_gerente_confirman(self):
        self.assertEqual(api_como(self.vendedor).post(url(self.pedido)).status_code, 403)
        self.assertEqual(api_como(crear_usuario("repartidor")).post(url(self.pedido)).status_code, 403)
        self.assertEqual(api_como(crear_usuario("gerente")).post(url(self.pedido)).status_code, 200)

    def test_un_usuario_demo_no_confirma_pedidos_reales(self):
        demo = crear_usuario("almacenero", username="demo_alm")
        demo.es_demo = True
        demo.save()
        r = api_como(demo).post(url(self.pedido))
        self.assertEqual(r.status_code, 403)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.estado, Pedido.Estado.EN_ALMACEN)
