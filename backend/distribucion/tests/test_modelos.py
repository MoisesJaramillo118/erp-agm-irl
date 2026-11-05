from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from config.demo import crear_pedido
from config.pruebas import crear_cliente, crear_producto, crear_usuario
from distribucion.models import Entrega
from ventas.models import Pedido


class EntregaTest(TestCase):
    def setUp(self):
        self.repartidor = crear_usuario("repartidor")
        self.pedido = crear_pedido(crear_cliente(), crear_usuario("vendedor"), [(crear_producto(), 2)])
        self.hoy = timezone.localdate()

    def test_programar_guarda_la_fecha_acordada_en_la_entrega_del_pedido(self):
        """HU09: la fecha acordada queda guardada en la Entrega creada con el pedido."""
        entrega = Entrega(pedido=self.pedido)
        entrega.programar(self.hoy + timedelta(days=2))
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.entrega.fecha_acordada, self.hoy + timedelta(days=2))

    def test_un_pedido_tiene_como_maximo_una_entrega(self):
        Entrega.objects.create(pedido=self.pedido, fecha_acordada=self.hoy)
        with self.assertRaises(Exception):
            Entrega.objects.create(pedido=self.pedido, fecha_acordada=self.hoy)

    def test_entrega_a_tiempo(self):
        """HU11: se guarda la fecha real y el sistema indica si fue a tiempo."""
        entrega = Entrega.objects.create(pedido=self.pedido, fecha_acordada=self.hoy)
        self.assertIsNone(entrega.esta_a_tiempo())
        entrega.registrar_entrega(repartidor=self.repartidor)
        self.assertEqual(entrega.fecha_entrega, self.hoy)
        self.assertTrue(entrega.esta_a_tiempo())
        self.assertTrue(entrega.conformidad_cliente)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.estado, Pedido.Estado.ENTREGADO)

    def test_entrega_tardia(self):
        entrega = Entrega.objects.create(pedido=self.pedido, fecha_acordada=self.hoy - timedelta(days=1))
        entrega.registrar_entrega(repartidor=self.repartidor)
        self.assertFalse(entrega.esta_a_tiempo())

    def test_entrega_vencida(self):
        """HU10: las entregas pasadas de fecha se marcan como «Vencida»."""
        ayer = Entrega.objects.create(pedido=self.pedido, fecha_acordada=self.hoy - timedelta(days=1))
        self.assertTrue(ayer.vencida)
        ayer.registrar_entrega()
        self.assertFalse(ayer.vencida)  # ya entregada: no está vencida
