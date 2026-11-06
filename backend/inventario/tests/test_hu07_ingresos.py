"""HU07: el almacenero registra el ingreso de mercadería.
Criterio (Tabla V): el ingreso aumenta el stock y queda en el historial de movimientos."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from config.pruebas import api_como, crear_cliente, crear_producto, crear_usuario
from inventario.models import MovimientoInventario, Producto
from ventas.servicios import registrar_pedido

INGRESOS = "/api/inventario/ingresos/"
HISTORIAL = "/api/inventario/movimientos/"


class HU07IngresoMercaderiaTest(TestCase):
    def setUp(self):
        self.almacenero = crear_usuario("almacenero")
        self.almacen = api_como(self.almacenero)
        self.vaso = crear_producto("VAS-5", stock=10)
        self.bolsa = crear_producto("BOL-1", stock=0)

    def _ingresar(self, lineas, api=None):
        return (api or self.almacen).post(INGRESOS, {"detalles": [{"producto": p.pk, "cantidad": c} for p, c in lineas]},
                                          format="json")

    def test_el_ingreso_aumenta_el_stock_y_queda_en_el_historial(self):
        antes = timezone.now()
        r = self._ingresar([(self.vaso, 50), (self.bolsa, 24)])
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Producto.objects.get(pk=self.vaso.pk).stock_actual, 60)
        self.assertEqual(Producto.objects.get(pk=self.bolsa.pk).stock_actual, 24)
        # La respuesta trae el stock nuevo de cada producto.
        self.assertEqual({p["codigo"]: p["stock_actual"] for p in r.data["productos"]}, {"VAS-5": 60, "BOL-1": 24})
        # Queda una entrada por producto, con usuario y fecha y hora del sistema.
        historial = self.almacen.get(HISTORIAL).data["results"]
        self.assertEqual(sorted((m["codigo"], m["tipo"], m["cantidad"]) for m in historial),
                         [("BOL-1", "entrada", 24), ("VAS-5", "entrada", 50)])
        for m in MovimientoInventario.objects.all():
            self.assertEqual(m.usuario, self.almacenero)
            self.assertTrue(antes <= m.fecha_hora <= timezone.now())

    def test_el_vendedor_ve_el_nuevo_disponible(self):
        # Integración: el stock que sube en inventario es el que consulta ventas (HU03).
        vendedor = crear_usuario("vendedor")
        registrar_pedido(crear_cliente(), vendedor, [(self.vaso, 10)], timezone.localdate() + timedelta(days=1))
        self._ingresar([(self.vaso, 15)])
        r = api_como(vendedor).get("/api/inventario/productos/?q=VAS-5")
        self.assertEqual(r.data["results"][0]["stock_disponible"], 15)  # 25 en almacén − 10 reservadas

    def test_si_una_linea_no_es_valida_no_se_registra_ninguna(self):
        r = self._ingresar([(self.vaso, 50), (self.bolsa, 0)])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Producto.objects.get(pk=self.vaso.pk).stock_actual, 10)
        self.assertFalse(MovimientoInventario.objects.exists())

    def test_no_acepta_el_mismo_producto_dos_veces_ni_una_lista_vacia(self):
        self.assertEqual(self._ingresar([(self.vaso, 1), (self.vaso, 2)]).status_code, 400)
        self.assertEqual(self._ingresar([]).status_code, 400)
        self.assertFalse(MovimientoInventario.objects.exists())

    def test_el_historial_filtra_por_tipo_y_producto(self):
        self._ingresar([(self.vaso, 5), (self.bolsa, 5)])
        self.vaso.actualizar_stock(3, "salida", self.almacenero)
        salidas = self.almacen.get(HISTORIAL + "?tipo=salida").data["results"]
        self.assertEqual([(m["codigo"], m["cantidad"]) for m in salidas], [("VAS-5", 3)])
        del_vaso = self.almacen.get(HISTORIAL + f"?producto={self.vaso.pk}").data["results"]
        self.assertEqual([m["tipo"] for m in del_vaso], ["salida", "entrada"])  # el más reciente primero

    def test_solo_el_almacen_y_el_gerente_registran_ingresos(self):
        self.assertEqual(self._ingresar([(self.vaso, 5)], api_como(crear_usuario("vendedor"))).status_code, 403)
        self.assertEqual(self._ingresar([(self.vaso, 5)], api_como(crear_usuario("repartidor"))).status_code, 403)
        self.assertEqual(self._ingresar([(self.vaso, 5)], api_como(crear_usuario("gerente"))).status_code, 201)

    def test_un_usuario_demo_solo_ingresa_productos_demo(self):
        demo = crear_usuario("almacenero", username="demo_alm")
        demo.es_demo = True
        demo.save()
        r = self._ingresar([(self.vaso, 5)], api_como(demo))
        self.assertEqual(r.status_code, 403)
        self.assertEqual(Producto.objects.get(pk=self.vaso.pk).stock_actual, 10)
