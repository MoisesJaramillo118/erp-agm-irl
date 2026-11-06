"""HU04: el vendedor registra el pedido con productos, cantidades y fecha de entrega acordada.
Criterio: el pedido queda con número, total y hora de registro automática, y aparece en la lista del almacén.
Si la cantidad supera el disponible, se avisa («Solo quedan N») y no se registra."""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from config.pruebas import api_como, crear_cliente, crear_producto, crear_usuario
from distribucion.models import Entrega
from inventario.models import MovimientoInventario
from ventas.models import Pedido


class HU04RegistrarPedidoTest(TestCase):
    def setUp(self):
        self.vendedor = crear_usuario("vendedor")
        self.api = api_como(self.vendedor)
        self.cliente = crear_cliente()
        self.vaso = crear_producto("VAS-5", precio="3.50", stock=100)
        self.bolsa = crear_producto("BOL-1", precio="12.00", stock=40)
        self.manana = timezone.localdate() + timedelta(days=1)

    def _registrar(self, lineas, fecha=None, api=None, **extra):
        datos = {"cliente": self.cliente.pk, "fecha_acordada": str(fecha or self.manana),
                 "detalles": [{"producto": p.pk, "cantidad": c} for p, c in lineas]}
        datos.update(extra)
        return (api or self.api).post("/api/ventas/pedidos/", datos, format="json")

    def test_pedido_queda_con_numero_total_hora_y_fecha_acordada(self):
        antes = timezone.now()
        r = self._registrar([(self.vaso, 10), (self.bolsa, 2)])
        self.assertEqual(r.status_code, 201, r.data)
        pedido = Pedido.objects.get(pk=r.data["id"])
        self.assertRegex(pedido.numero, r"^P-\d{6}$")
        self.assertEqual(r.data["numero"], pedido.numero)
        self.assertEqual(pedido.total, Decimal("59.00"))  # 10×3.50 + 2×12.00
        self.assertTrue(antes <= pedido.hora_registro <= timezone.now())
        self.assertEqual(pedido.estado, Pedido.Estado.EN_ALMACEN)
        self.assertEqual(pedido.vendedor, self.vendedor)
        # La fecha acordada queda en la Entrega creada junto con el pedido.
        self.assertEqual(Entrega.objects.get(pedido=pedido).fecha_acordada, self.manana)
        self.assertEqual(r.data["fecha_acordada"], str(self.manana))

    def test_el_usuario_no_puede_poner_la_hora_el_numero_ni_el_precio(self):
        ayer = (timezone.now() - timedelta(days=1)).isoformat()
        r = self._registrar([(self.vaso, 1)], hora_registro=ayer, numero="P-999999", total="1.00",
                            hora_conformidad=ayer, estado="entregado")
        pedido = Pedido.objects.get(pk=r.data["id"])
        self.assertGreater(pedido.hora_registro, timezone.now() - timedelta(minutes=1))
        self.assertNotEqual(pedido.numero, "P-999999")
        self.assertEqual(pedido.total, Decimal("3.50"))
        self.assertIsNone(pedido.hora_conformidad)
        self.assertEqual(pedido.estado, Pedido.Estado.EN_ALMACEN)
        self.assertEqual(pedido.detalles.get().precio_unitario, Decimal("3.50"))

    def test_el_pedido_aparece_en_la_lista_del_almacen(self):
        r = self._registrar([(self.vaso, 5)])
        almacen = api_como(crear_usuario("almacenero")).get("/api/ventas/pedidos/?estado=en_almacen")
        self.assertEqual(almacen.status_code, 200)
        self.assertIn(r.data["numero"], [p["numero"] for p in almacen.data["results"]])

    def test_la_lista_del_almacen_va_en_orden_de_llegada(self):
        numeros = [self._registrar([(self.vaso, 1)]).data["numero"] for _ in range(3)]
        almacen = api_como(crear_usuario("almacenero")).get("/api/ventas/pedidos/?estado=en_almacen")
        self.assertEqual([p["numero"] for p in almacen.data["results"]], numeros)

    def test_cantidad_mayor_al_disponible_avisa_solo_quedan_y_no_registra(self):
        r = self._registrar([(self.vaso, 10), (self.bolsa, 41)])
        self.assertEqual(r.status_code, 400)
        self.assertIn("Solo quedan 40", r.data["detail"])
        self.assertEqual(r.data["faltantes"][0]["producto"], self.bolsa.pk)
        self.assertEqual(r.data["faltantes"][0]["disponible"], 40)
        self.assertFalse(Pedido.objects.exists())  # tampoco se registra la línea que sí alcanzaba
        self.assertFalse(Entrega.objects.exists())

    def test_la_reserva_de_un_pedido_en_almacen_impide_vender_ese_stock_otra_vez(self):
        """Reserva (tesis 7.3, Tabla IV): el segundo pedido solo puede tomar lo que queda disponible."""
        self.assertEqual(self._registrar([(self.bolsa, 30)]).status_code, 201)
        otro_vendedor = api_como(crear_usuario("vendedor", "vendedor2"))
        r = self._registrar([(self.bolsa, 11)], api=otro_vendedor)
        self.assertEqual(r.status_code, 400)
        self.assertIn("Solo quedan 10", r.data["detail"])
        self.assertEqual(self._registrar([(self.bolsa, 10)], api=otro_vendedor).status_code, 201)
        # stock_actual no baja al registrar: recién baja cuando el almacén confirma (HU06).
        self.bolsa.refresh_from_db()
        self.assertEqual(self.bolsa.stock_actual, 40)
        self.assertEqual(self.bolsa.consultar_stock(), 0)
        self.assertFalse(MovimientoInventario.objects.exists())

    def test_al_confirmar_el_almacen_el_disponible_no_cambia(self):
        r = self._registrar([(self.bolsa, 30)])
        Pedido.objects.get(pk=r.data["id"]).confirmar_conformidad(crear_usuario("almacenero"))
        self.bolsa.refresh_from_db()
        self.assertEqual((self.bolsa.stock_actual, self.bolsa.consultar_stock()), (10, 10))
        self.assertEqual(self._registrar([(self.bolsa, 11)]).status_code, 400)

    def test_validaciones_de_los_datos(self):
        ayer = timezone.localdate() - timedelta(days=1)
        self.assertEqual(self._registrar([(self.vaso, 1)], fecha=ayer).status_code, 400)
        self.assertEqual(self._registrar([]).status_code, 400)
        self.assertEqual(self._registrar([(self.vaso, 0)]).status_code, 400)
        self.assertEqual(self._registrar([(self.vaso, 1), (self.vaso, 2)]).status_code, 400)
        self.assertEqual(self._registrar([(self.vaso, 1)], cliente=99999).status_code, 400)
        self.assertFalse(Pedido.objects.exists())

    def test_solo_el_vendedor_y_el_gerente_registran_pedidos(self):
        for rol in ("almacenero", "repartidor"):
            self.assertEqual(self._registrar([(self.vaso, 1)], api=api_como(crear_usuario(rol))).status_code, 403, rol)
        self.assertEqual(self._registrar([(self.vaso, 1)], api=api_como(crear_usuario("gerente"))).status_code, 201)

    def test_el_vendedor_solo_ve_sus_pedidos(self):
        self._registrar([(self.vaso, 1)])
        otro = api_como(crear_usuario("vendedor", "vendedor2"))
        self._registrar([(self.vaso, 1)], api=otro)
        self.assertEqual(self.api.get("/api/ventas/pedidos/").data["count"], 1)
        self.assertEqual(api_como(crear_usuario("gerente")).get("/api/ventas/pedidos/").data["count"], 2)

    def test_pedido_de_un_vendedor_demo_queda_marcado_como_demo(self):
        demo = crear_usuario("vendedor", "demo_v")
        demo.es_demo = True
        demo.save()
        r = self._registrar([(self.vaso, 1)], api=api_como(demo))
        self.assertTrue(r.data["es_demo"])
        self.assertTrue(r.data["numero"].startswith("D-"))
