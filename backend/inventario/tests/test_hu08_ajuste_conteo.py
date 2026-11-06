"""HU08 (acordado en la review del Sprint 2): «Ajustar el stock a lo contado».
Crea un movimiento de tipo ajuste por cada producto con diferencia, con usuario y hora del sistema,
y se puede usar una sola vez por conteo."""
from django.test import TestCase
from django.utils import timezone

from config.pruebas import api_como, crear_producto, crear_usuario
from inventario.models import ConteoFisico, MovimientoInventario, Producto

CONTEOS = "/api/inventario/conteos/"


class HU08AjusteDelConteoTest(TestCase):
    def setUp(self):
        self.almacenero = crear_usuario("almacenero")
        self.almacen = api_como(self.almacenero)
        self.p1, self.p2, self.p3 = (crear_producto(f"P-{i}", stock=s) for i, s in enumerate([40, 25, 10], start=1))

    def _contar(self, fisicos):
        detalles = [{"producto": p.pk, "stock_fisico": f} for p, f in zip((self.p1, self.p2, self.p3), fisicos)]
        r = self.almacen.post(CONTEOS, {"detalles": detalles}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["id"]

    def _ajustar(self, conteo_id, api=None):
        return (api or self.almacen).post(f"{CONTEOS}{conteo_id}/ajustar/")

    def _stock(self):
        return [Producto.objects.get(pk=p.pk).stock_actual for p in (self.p1, self.p2, self.p3)]

    def test_crea_un_ajuste_por_producto_con_diferencia_con_usuario_y_hora_del_sistema(self):
        conteo = self._contar([40, 22, 13])  # P-2 tiene 3 menos y P-3 tiene 3 más
        antes = timezone.now()
        r = self._ajustar(conteo)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self._stock(), [40, 22, 13])
        ajustes = MovimientoInventario.objects.filter(tipo="ajuste").order_by("producto__codigo")
        self.assertEqual([(m.producto.codigo, m.cantidad) for m in ajustes], [("P-2", -3), ("P-3", 3)])
        for m in ajustes:
            self.assertEqual(m.usuario, self.almacenero)
            self.assertTrue(antes <= m.fecha_hora <= timezone.now())
        self.assertIsNotNone(r.data["hora_ajuste"])
        self.assertEqual(len(r.data["movimientos"]), 2)
        # La exactitud del conteo no cambia: mide cómo estaba el inventario cuando se contó.
        self.assertEqual(r.data["exactitud"], round(1 / 3 * 100, 2))

    def test_se_puede_usar_una_sola_vez_por_conteo(self):
        conteo = self._contar([40, 22, 10])
        self.assertEqual(self._ajustar(conteo).status_code, 200)
        r = self._ajustar(conteo)
        self.assertEqual(r.status_code, 409)
        self.assertIn("ya se ajustó", r.data["detail"])
        self.assertEqual(self._stock(), [40, 22, 10])
        self.assertEqual(MovimientoInventario.objects.filter(tipo="ajuste").count(), 1)

    def test_suma_la_diferencia_y_respeta_los_movimientos_posteriores_al_conteo(self):
        conteo = self._contar([40, 22, 10])  # faltan 3 de P-2
        self.p2.actualizar_stock(50, "entrada", self.almacenero)  # llega mercadería después del conteo
        self._ajustar(conteo)
        self.assertEqual(Producto.objects.get(pk=self.p2.pk).stock_actual, 72)  # 25 + 50 − 3

    def test_sin_diferencias_no_hay_nada_que_ajustar(self):
        conteo = self._contar([40, 25, 10])
        r = self._ajustar(conteo)
        self.assertEqual(r.status_code, 400)
        self.assertIsNone(ConteoFisico.objects.get(pk=conteo).hora_ajuste)

    def test_si_un_producto_quedaria_en_negativo_no_se_ajusta_ninguno(self):
        conteo = self._contar([41, 20, 10])  # +1 en P-1 y −5 en P-2
        self.p2.actualizar_stock(23, "salida", self.almacenero)  # quedan 2: el ajuste de −5 dejaría −3
        r = self._ajustar(conteo)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self._stock(), [40, 2, 10])
        self.assertFalse(MovimientoInventario.objects.filter(tipo="ajuste").exists())
        self.assertIsNone(ConteoFisico.objects.get(pk=conteo).hora_ajuste)

    def test_solo_el_almacen_y_el_gerente_ajustan(self):
        conteo = self._contar([40, 22, 10])
        self.assertEqual(self._ajustar(conteo, api_como(crear_usuario("vendedor"))).status_code, 403)
        self.assertEqual(self._ajustar(conteo, api_como(crear_usuario("gerente"))).status_code, 200)
