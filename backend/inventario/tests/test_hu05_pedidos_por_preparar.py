"""HU05: el almacenero ve los pedidos pendientes en el orden en que llegan.
Criterio (Tabla V): la lista muestra cada pedido nuevo apenas se registra."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from config.pruebas import api_como, crear_cliente, crear_producto, crear_usuario
from ventas.models import Pedido

LISTA = "/api/inventario/pedidos/"


class HU05PedidosPorPrepararTest(TestCase):
    def setUp(self):
        self.vendedor = crear_usuario("vendedor")
        self.almacenero = crear_usuario("almacenero")
        self.almacen = api_como(self.almacenero)
        self.cliente = crear_cliente()
        self.vaso = crear_producto("VAS-5", stock=100)
        self.manana = str(timezone.localdate() + timedelta(days=1))

    def _registrar(self, cantidad=5):
        r = api_como(self.vendedor).post("/api/ventas/pedidos/", {
            "cliente": self.cliente.pk, "fecha_acordada": self.manana,
            "detalles": [{"producto": self.vaso.pk, "cantidad": cantidad}],
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        return r.data

    def test_un_pedido_nuevo_aparece_en_la_lista_apenas_se_registra(self):
        self.assertEqual(self.almacen.get(LISTA).data["count"], 0)
        nuevo = self._registrar()
        r = self.almacen.get(LISTA)
        self.assertEqual(r.status_code, 200)
        self.assertEqual([p["numero"] for p in r.data["results"]], [nuevo["numero"]])
        pedido = r.data["results"][0]
        # El almacén ve lo necesario para prepararlo: cliente, distrito, productos, cantidades y fecha acordada.
        self.assertEqual(pedido["cliente_nombre"], self.cliente.nombre)
        self.assertEqual(pedido["distrito"], "Comas")
        self.assertEqual(pedido["fecha_acordada"], self.manana)
        self.assertEqual(pedido["detalles"][0]["descripcion"], self.vaso.descripcion)
        self.assertEqual(pedido["detalles"][0]["cantidad"], 5)
        self.assertEqual(pedido["detalles"][0]["unidad"], self.vaso.unidad)

    def test_los_pedidos_salen_en_orden_de_llegada_y_solo_los_pendientes(self):
        primero, segundo, tercero = self._registrar(), self._registrar(), self._registrar()
        # El segundo se registró antes que todos (por ejemplo, por un reloj atrasado): debe salir primero.
        Pedido.objects.filter(pk=segundo["id"]).update(hora_registro=timezone.now() - timedelta(hours=1))
        Pedido.objects.get(pk=tercero["id"]).confirmar_conformidad(self.almacenero)
        numeros = [p["numero"] for p in self.almacen.get(LISTA).data["results"]]
        self.assertEqual(numeros, [segundo["numero"], primero["numero"]])

    def test_conformes_de_hoy(self):
        a, b = self._registrar(), self._registrar()
        Pedido.objects.get(pk=a["id"]).confirmar_conformidad(self.almacenero)
        # Un pedido confirmado ayer no aparece entre los conformes de hoy.
        viejo = Pedido.objects.get(pk=b["id"])
        viejo.confirmar_conformidad(self.almacenero)
        Pedido.objects.filter(pk=viejo.pk).update(hora_conformidad=timezone.now() - timedelta(days=1))
        r = self.almacen.get(LISTA + "?conformes_hoy=1")
        self.assertEqual([p["numero"] for p in r.data["results"]], [a["numero"]])
        self.assertIsNotNone(r.data["results"][0]["tiempo_atencion"])

    def test_solo_el_almacen_y_el_gerente_ven_la_lista(self):
        self.assertEqual(api_como(self.vendedor).get(LISTA).status_code, 403)
        self.assertEqual(api_como(crear_usuario("repartidor")).get(LISTA).status_code, 403)
        self.assertEqual(api_como(crear_usuario("gerente")).get(LISTA).status_code, 200)
        self.assertEqual(self.client.get(LISTA).status_code, 401)
