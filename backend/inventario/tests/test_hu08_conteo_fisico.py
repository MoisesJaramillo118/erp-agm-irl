"""HU08: el almacenero registra el conteo físico.
Criterio (Tabla V): el sistema muestra la diferencia de cada producto y la exactitud del conteo
(exactitud = productos que coinciden / productos contados × 100)."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from config.pruebas import api_como, crear_cliente, crear_producto, crear_usuario
from inventario.models import ConteoFisico, MovimientoInventario, Producto
from ventas.servicios import registrar_pedido

CONTEOS = "/api/inventario/conteos/"


class HU08ConteoFisicoTest(TestCase):
    def setUp(self):
        self.almacenero = crear_usuario("almacenero")
        self.almacen = api_como(self.almacenero)
        self.productos = [crear_producto(f"P-{i}", stock=s) for i, s in enumerate([40, 25, 10, 0], start=1)]

    def _contar(self, fisicos, api=None, **extra):
        detalles = [{"producto": p.pk, "stock_fisico": f, **extra} for p, f in zip(self.productos, fisicos)]
        return (api or self.almacen).post(CONTEOS, {"detalles": detalles}, format="json")

    def test_muestra_la_diferencia_de_cada_producto_y_la_exactitud(self):
        r = self._contar([40, 22, 10, 1])  # P-2 tiene 3 menos y P-4 tiene 1 más: coinciden 2 de 4
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["contados"], 4)
        self.assertEqual(r.data["coinciden"], 2)
        self.assertEqual(r.data["exactitud"], 50.0)
        diferencias = {d["codigo"]: (d["stock_sistema"], d["stock_fisico"], d["diferencia"], d["coincide"])
                       for d in r.data["detalles"]}
        self.assertEqual(diferencias, {
            "P-1": (40, 40, 0, True), "P-2": (25, 22, -3, False),
            "P-3": (10, 10, 0, True), "P-4": (0, 1, 1, False),
        })
        # Las diferencias más grandes salen primero.
        self.assertEqual(r.data["detalles"][0]["codigo"], "P-2")
        # La exactitud es la que calcula el método del diagrama de clases.
        self.assertEqual(ConteoFisico.objects.get().calcular_exactitud(), 50.0)

    def test_el_stock_del_sistema_lo_pone_el_sistema(self):
        r = self._contar([40, 25, 10, 0], stock_sistema=999)
        self.assertEqual(r.data["exactitud"], 100.0)
        self.assertEqual([d["stock_sistema"] for d in r.data["detalles"]].count(999), 0)

    def test_compara_con_el_stock_en_almacen_que_incluye_lo_reservado(self):
        # Lo reservado por un pedido sin preparar sigue en el anaquel, así que se cuenta.
        registrar_pedido(crear_cliente(), crear_usuario("vendedor"), [(self.productos[0], 15)],
                         timezone.localdate() + timedelta(days=1))
        r = self._contar([40, 25, 10, 0])
        self.assertEqual(r.data["exactitud"], 100.0)

    def test_el_conteo_no_cambia_el_stock(self):
        self._contar([0, 0, 0, 0])
        self.assertEqual([Producto.objects.get(pk=p.pk).stock_actual for p in self.productos], [40, 25, 10, 0])
        self.assertFalse(MovimientoInventario.objects.exists())

    def test_la_lista_de_conteos_muestra_la_exactitud_de_cada_uno(self):
        self._contar([40, 25, 10, 0])
        self._contar([39, 25, 10, 0])
        r = self.almacen.get(CONTEOS)
        self.assertEqual([c["exactitud"] for c in r.data["results"]], [75.0, 100.0])  # el más reciente primero
        self.assertEqual(r.data["results"][0]["fecha"], str(timezone.localdate()))
        detalle = self.almacen.get(f"{CONTEOS}{r.data['results'][0]['id']}/")
        self.assertEqual(len(detalle.data["detalles"]), 4)

    def test_valida_las_cantidades(self):
        self.assertEqual(self._contar([40, -1, 10, 0]).status_code, 400)
        self.assertEqual(self.almacen.post(CONTEOS, {"detalles": []}, format="json").status_code, 400)
        p = self.productos[0]
        repetido = {"detalles": [{"producto": p.pk, "stock_fisico": 1}, {"producto": p.pk, "stock_fisico": 2}]}
        self.assertEqual(self.almacen.post(CONTEOS, repetido, format="json").status_code, 400)
        self.assertFalse(ConteoFisico.objects.exists())

    def test_solo_el_almacen_y_el_gerente_registran_conteos(self):
        self.assertEqual(self._contar([1, 1, 1, 1], api_como(crear_usuario("vendedor"))).status_code, 403)
        self.assertEqual(self._contar([1, 1, 1, 1], api_como(crear_usuario("gerente"))).status_code, 201)

    def test_el_conteo_de_un_usuario_demo_es_demo(self):
        demo = crear_usuario("almacenero", username="demo_alm")
        demo.es_demo = True
        demo.save()
        self.assertEqual(self._contar([1, 1, 1, 1], api_como(demo)).status_code, 403)  # productos reales
        Producto.objects.update(es_demo=True)
        self.assertEqual(self._contar([1, 1, 1, 1], api_como(demo)).status_code, 201)
        self.assertTrue(ConteoFisico.objects.get().es_demo)

    def test_categorias_para_cargar_una_categoria_completa(self):
        crear_producto("V-1", categoria="Vasos")
        r = self.almacen.get("/api/inventario/categorias/")
        self.assertEqual(r.data, ["Bolsas", "Vasos"])
        vasos = self.almacen.get("/api/inventario/productos/?categoria=vasos").data["results"]
        self.assertEqual([p["codigo"] for p in vasos], ["V-1"])
