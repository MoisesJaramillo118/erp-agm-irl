from django.test import TestCase

from config.pruebas import crear_producto, crear_usuario
from inventario.models import ConteoFisico, DetalleConteo, MovimientoInventario, StockInsuficiente

Tipo = MovimientoInventario.Tipo


class ProductoStockTest(TestCase):
    def setUp(self):
        self.almacenero = crear_usuario("almacenero")
        self.producto = crear_producto(stock=100)

    def test_consultar_stock(self):
        self.assertEqual(self.producto.consultar_stock(), 100)

    def test_entrada_sube_el_stock_y_queda_en_el_historial(self):
        """HU07: el ingreso aumenta el stock y queda en el historial de movimientos."""
        mov = self.producto.actualizar_stock(40, Tipo.ENTRADA, self.almacenero)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 140)
        self.assertEqual((mov.tipo, mov.cantidad, mov.usuario), (Tipo.ENTRADA, 40, self.almacenero))
        self.assertEqual(self.producto.movimientos.count(), 1)

    def test_salida_baja_el_stock(self):
        self.producto.actualizar_stock(30, Tipo.SALIDA, self.almacenero)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 70)

    def test_salida_mayor_al_stock_se_rechaza_y_no_cambia_nada(self):
        with self.assertRaises(StockInsuficiente):
            self.producto.actualizar_stock(101, Tipo.SALIDA, self.almacenero)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 100)
        self.assertEqual(self.producto.movimientos.count(), 0)

    def test_ajuste_con_signo(self):
        self.producto.actualizar_stock(-7, Tipo.AJUSTE, self.almacenero)
        self.producto.actualizar_stock(3, Tipo.AJUSTE, self.almacenero)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 96)

    def test_cantidad_cero_o_negativa_en_entrada_se_rechaza(self):
        with self.assertRaises(ValueError):
            self.producto.actualizar_stock(0, Tipo.ENTRADA, self.almacenero)

    def test_la_hora_del_movimiento_la_pone_el_sistema(self):
        mov = self.producto.actualizar_stock(1, Tipo.ENTRADA, self.almacenero)
        self.assertIsNotNone(mov.fecha_hora)


class ConteoFisicoTest(TestCase):
    def test_exactitud_es_coinciden_entre_contados_por_cien(self):
        """HU08: exactitud = coinciden / contados × 100 y se ve la diferencia por producto."""
        usuario = crear_usuario("almacenero")
        conteo = ConteoFisico.objects.create(usuario=usuario)
        datos = [(100, 100), (50, 48), (30, 30), (10, 12)]  # 2 de 4 coinciden → 50 %
        detalles = []
        for i, (sistema, fisico) in enumerate(datos):
            p = crear_producto(codigo=f"C-{i}")
            detalles.append(DetalleConteo.objects.create(conteo=conteo, producto=p,
                                                         stock_sistema=sistema, stock_fisico=fisico))
        self.assertEqual(conteo.calcular_exactitud(), 50.0)
        self.assertEqual([d.diferencia for d in detalles], [0, -2, 0, 2])

    def test_conteo_vacio_no_tiene_exactitud(self):
        conteo = ConteoFisico.objects.create(usuario=crear_usuario("almacenero"))
        self.assertIsNone(conteo.calcular_exactitud())
