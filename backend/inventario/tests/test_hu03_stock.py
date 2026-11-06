"""HU03: el vendedor consulta el stock disponible. El stock mostrado es el mismo que registra inventario.
Disponible = stock_actual − cantidades de los pedidos en estado en_almacen (reserva, tesis 7.3 y Tabla IV)."""
from django.test import TestCase

from config.pruebas import api_como, crear_cliente, crear_producto, crear_usuario
from ventas.servicios import crear_pedido


class HU03StockDisponibleTest(TestCase):
    def setUp(self):
        self.vendedor = crear_usuario("vendedor")
        self.almacenero = crear_usuario("almacenero")
        self.producto = crear_producto("BOL-1", stock=100)
        self.cliente = crear_cliente()

    def _ver(self, usuario):
        r = api_como(usuario).get(f"/api/inventario/productos/{self.producto.pk}/")
        self.assertEqual(r.status_code, 200)
        return r.data

    def test_vendedor_ve_el_mismo_stock_que_registra_inventario(self):
        self.producto.actualizar_stock(25, "entrada", self.almacenero)  # inventario registra un ingreso
        datos_vendedor = self._ver(self.vendedor)
        datos_almacen = self._ver(self.almacenero)
        self.producto.refresh_from_db()
        self.assertEqual(datos_vendedor["stock_actual"], self.producto.stock_actual)
        self.assertEqual(datos_vendedor["stock_disponible"], self.producto.consultar_stock())
        self.assertEqual(datos_vendedor, datos_almacen)
        self.assertEqual(datos_vendedor["stock_disponible"], 125)

    def test_los_pedidos_en_almacen_reservan_stock(self):
        crear_pedido(self.cliente, self.vendedor, [(self.producto, 30)])
        crear_pedido(self.cliente, self.vendedor, [(self.producto, 20)])
        datos = self._ver(self.vendedor)
        self.assertEqual((datos["stock_actual"], datos["stock_reservado"], datos["stock_disponible"]), (100, 50, 50))
        self.assertEqual(self.producto.consultar_stock(), 50)

    def test_al_confirmar_baja_stock_actual_y_se_libera_la_reserva(self):
        """El disponible no cambia al confirmar: la reserva pasa a ser una salida real (HU06)."""
        pedido = crear_pedido(self.cliente, self.vendedor, [(self.producto, 30)])
        pedido.confirmar_conformidad(self.almacenero)
        datos = self._ver(self.vendedor)
        self.assertEqual((datos["stock_actual"], datos["stock_reservado"], datos["stock_disponible"]), (70, 0, 70))

    def test_busca_por_codigo_o_descripcion(self):
        crear_producto("VAS-5", stock=10)
        api = api_como(self.vendedor)
        self.assertEqual([p["codigo"] for p in api.get("/api/inventario/productos/?q=vas").data["results"]], ["VAS-5"])
        self.assertEqual(api.get("/api/inventario/productos/?q=Producto BOL").data["count"], 1)

    def test_filtra_por_estado_del_disponible(self):
        """Filtro de la consulta: sin stock, bajo mínimo y con stock, según el disponible (no el stock físico)."""
        crear_producto("SIN-1", stock=0, minimo=10)
        crear_producto("BAJO-1", stock=5, minimo=10)
        reservado = crear_producto("RES-1", stock=30, minimo=10)  # 30 físicos, 25 reservados → 5 disponibles
        crear_pedido(self.cliente, self.vendedor, [(reservado, 25)])
        api = api_como(self.vendedor)

        def codigos(estado):
            return sorted(p["codigo"] for p in api.get(f"/api/inventario/productos/?estado={estado}").data["results"])

        self.assertEqual(codigos("sin_stock"), ["SIN-1"])
        self.assertEqual(codigos("bajo_minimo"), ["BAJO-1", "RES-1"])
        self.assertEqual(codigos("con_stock"), ["BOL-1"])

    def test_por_pagina_permite_pedir_solo_el_total(self):
        for i in range(3):
            crear_producto(f"X-{i}")
        r = api_como(self.vendedor).get("/api/inventario/productos/?por_pagina=1")
        self.assertEqual((r.data["count"], len(r.data["results"])), (4, 1))

    def test_el_repartidor_no_consulta_stock(self):
        r = api_como(crear_usuario("repartidor")).get("/api/inventario/productos/")
        self.assertEqual(r.status_code, 403)

    def test_el_stock_es_de_solo_lectura_desde_esta_consulta(self):
        r = api_como(self.vendedor).patch(f"/api/inventario/productos/{self.producto.pk}/", {"stock_actual": 999},
                                          format="json")
        self.assertEqual(r.status_code, 405)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 100)
