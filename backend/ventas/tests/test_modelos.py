from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from config.demo import crear_pedido
from config.pruebas import crear_cliente, crear_producto, crear_usuario
from inventario.models import MovimientoInventario, StockInsuficiente
from ventas.models import Pedido, PedidoNoPendiente


class PedidoTest(TestCase):
    def setUp(self):
        self.vendedor = crear_usuario("vendedor")
        self.almacenero = crear_usuario("almacenero")
        self.cliente = crear_cliente()
        self.a = crear_producto("A", precio="10.50", stock=100)
        self.b = crear_producto("B", precio="2.25", stock=50)

    def test_pedido_queda_con_numero_total_y_hora_de_registro_automatica(self):
        """HU04: el pedido queda con número, total y hora de registro automática."""
        antes = timezone.now()
        pedido = crear_pedido(self.cliente, self.vendedor, [(self.a, 3), (self.b, 4)])
        self.assertRegex(pedido.numero, r"^P-\d{6}$")
        self.assertEqual(pedido.total, Decimal("40.50"))  # 3×10.50 + 4×2.25
        self.assertGreaterEqual(pedido.hora_registro, antes)
        self.assertLessEqual(pedido.hora_registro, timezone.now())
        self.assertEqual(pedido.estado, Pedido.Estado.EN_ALMACEN)
        self.assertIsNone(pedido.hora_conformidad)

    def test_numeros_de_pedido_son_unicos_y_los_de_demo_se_distinguen(self):
        p1 = crear_pedido(self.cliente, self.vendedor, [(self.a, 1)])
        p2 = crear_pedido(self.cliente, self.vendedor, [(self.a, 1)])
        p3 = crear_pedido(self.cliente, self.vendedor, [(self.a, 1)], es_demo=True)
        self.assertNotEqual(p1.numero, p2.numero)
        self.assertTrue(p3.numero.startswith("D-"))

    def test_calcular_total_se_actualiza_al_cambiar_los_detalles(self):
        pedido = crear_pedido(self.cliente, self.vendedor, [(self.a, 2)])
        self.assertEqual(pedido.total, Decimal("21.00"))
        pedido.detalles.create(producto=self.b, cantidad=2, precio_unitario=self.b.precio)
        self.assertEqual(pedido.calcular_total(), Decimal("25.50"))

    def test_confirmar_conformidad_baja_stock_crea_salidas_y_guarda_la_hora(self):
        """HU06: el stock baja, se crean los movimientos de salida y se guarda la hora de conformidad."""
        pedido = crear_pedido(self.cliente, self.vendedor, [(self.a, 10), (self.b, 5)])
        pedido.confirmar_conformidad(self.almacenero)
        pedido.refresh_from_db()
        self.a.refresh_from_db(), self.b.refresh_from_db()
        self.assertEqual((self.a.stock_actual, self.b.stock_actual), (90, 45))
        self.assertEqual(pedido.estado, Pedido.Estado.PREPARADO)
        self.assertIsNotNone(pedido.hora_conformidad)
        salidas = MovimientoInventario.objects.filter(tipo=MovimientoInventario.Tipo.SALIDA)
        self.assertEqual(sorted(s.cantidad for s in salidas), [5, 10])
        self.assertTrue(all(s.usuario == self.almacenero for s in salidas))

    def test_confirmar_sin_stock_suficiente_no_cambia_nada(self):
        pedido = crear_pedido(self.cliente, self.vendedor, [(self.a, 10), (self.b, 999)])
        with self.assertRaises(StockInsuficiente):
            pedido.confirmar_conformidad(self.almacenero)
        pedido.refresh_from_db()
        self.a.refresh_from_db()
        self.assertEqual(pedido.estado, Pedido.Estado.EN_ALMACEN)
        self.assertEqual(self.a.stock_actual, 100)  # la transacción se revirtió completa
        self.assertEqual(MovimientoInventario.objects.count(), 0)

    def test_no_se_confirma_dos_veces(self):
        pedido = crear_pedido(self.cliente, self.vendedor, [(self.a, 10)])
        pedido.confirmar_conformidad(self.almacenero)
        with self.assertRaises(PedidoNoPendiente):
            pedido.confirmar_conformidad(self.almacenero)
        self.a.refresh_from_db()
        self.assertEqual(self.a.stock_actual, 90)

    def test_tiempo_de_atencion_en_minutos(self):
        pedido = crear_pedido(self.cliente, self.vendedor, [(self.a, 1)])
        self.assertIsNone(pedido.tiempo_atencion())
        pedido.hora_conformidad = pedido.hora_registro + timedelta(minutes=12, seconds=30)
        self.assertEqual(pedido.tiempo_atencion(), 12.5)
