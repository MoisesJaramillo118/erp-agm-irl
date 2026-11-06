import os
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from config.pruebas import crear_cliente, crear_producto, crear_usuario
from distribucion.models import Entrega
from inventario.models import ConteoFisico, MovimientoInventario, Producto
from usuarios.models import Usuario
from ventas.models import Cliente, DetallePedido, Pedido


def ejecutar(*args):
    salida = StringIO()
    call_command(*args, stdout=salida)
    return salida.getvalue()


@mock.patch.dict(os.environ, {"DEMO_PASSWORD": "clave-demo-de-prueba"})
class SeedDemoTest(TestCase):
    def test_crea_20_productos_demo_usuarios_por_rol_e_historial(self):
        ejecutar("seed_demo", "--semanas", "16")
        demo = Producto.objects.filter(es_demo=True)
        self.assertEqual(demo.count(), 20)
        self.assertTrue(all(p.codigo.startswith("DEMO-") for p in demo))
        self.assertEqual(set(Usuario.objects.filter(es_demo=True).values_list("rol", flat=True)),
                         set(Usuario.Rol.values))
        self.assertGreater(Pedido.objects.filter(es_demo=True, numero__startswith="DH-").count(), 60)
        # Todo lo creado está marcado como DEMO; no queda nada sin marcar.
        self.assertFalse(Pedido.objects.filter(es_demo=False).exists())
        self.assertFalse(Cliente.objects.filter(es_demo=False).exists())

    def test_los_usuarios_demo_entran_con_la_contrasena_del_entorno(self):
        ejecutar("seed_demo", "--semanas", "12")
        for username in ("demo_gerente", "demo_vendedor", "demo_almacenero", "demo_repartidor"):
            self.assertTrue(Usuario.objects.get(username=username).check_password("clave-demo-de-prueba"))

    def test_hay_pedidos_de_ejemplo_en_cada_estado_con_su_entrega(self):
        ejecutar("seed_demo", "--semanas", "12")
        estados = set(Pedido.objects.exclude(numero__startswith="DH-").values_list("estado", flat=True))
        self.assertEqual(estados, set(Pedido.Estado.values))
        ejemplo = Pedido.objects.exclude(numero__startswith="DH-")
        self.assertEqual(Entrega.objects.filter(pedido__in=ejemplo).count(), ejemplo.count())

    def test_el_historial_tiene_mas_ventas_en_julio_y_diciembre(self):
        ejecutar("seed_demo", "--semanas", "104")
        from django.db.models import Sum
        por_mes = {}
        for m in (7, 12, 3, 9):
            suma = DetallePedido.objects.filter(
                pedido__es_demo=True, pedido__numero__startswith="DH-", pedido__hora_registro__month=m
            ).aggregate(t=Sum("cantidad"))["t"]
            dias = Pedido.objects.filter(numero__startswith="DH-", hora_registro__month=m).count()
            por_mes[m] = suma / dias
        self.assertGreater(por_mes[7], por_mes[3] * 1.2)
        self.assertGreater(por_mes[12], por_mes[9] * 1.3)

    def test_no_se_duplica_sin_reiniciar(self):
        ejecutar("seed_demo", "--semanas", "12")
        with self.assertRaises(CommandError):
            ejecutar("seed_demo", "--semanas", "12")
        ejecutar("seed_demo", "--semanas", "12", "--reiniciar")
        self.assertEqual(Producto.objects.filter(es_demo=True).count(), 20)


@mock.patch.dict(os.environ, {"DEMO_PASSWORD": "clave-demo-de-prueba"})
class BorrarDemoTest(TestCase):
    def test_borra_todo_lo_demo_y_no_toca_los_datos_reales(self):
        # Datos reales preexistentes.
        real_usuario = crear_usuario("vendedor", "real_vendedor")
        real_producto = crear_producto("REAL-1", stock=10)
        real_cliente = crear_cliente("20555555551", "Cliente real")
        real_producto.actualizar_stock(5, "entrada", real_usuario)

        ejecutar("seed_demo", "--semanas", "12")
        ejecutar("borrar_demo")

        for modelo in (Producto, Cliente, Pedido, Usuario, MovimientoInventario, ConteoFisico, Entrega):
            campo = "es_demo" if hasattr(modelo, "es_demo") else None
            if campo:
                self.assertFalse(modelo.objects.filter(es_demo=True).exists(), modelo.__name__)
        self.assertFalse(DetallePedido.objects.exists())
        self.assertFalse(Entrega.objects.exists())
        # Lo real sigue ahí, intacto.
        self.assertTrue(Usuario.objects.filter(pk=real_usuario.pk).exists())
        self.assertEqual(Producto.objects.get(pk=real_producto.pk).stock_actual, 15)
        self.assertTrue(Cliente.objects.filter(pk=real_cliente.pk).exists())
        self.assertEqual(MovimientoInventario.objects.count(), 1)

    def test_si_un_dato_real_depende_de_uno_demo_no_se_borra_nada(self):
        ejecutar("seed_demo", "--semanas", "12")
        from ventas.servicios import crear_pedido
        demo_producto = Producto.objects.filter(es_demo=True).first()
        real_vendedor = crear_usuario("vendedor", "real_vendedor")
        crear_pedido(crear_cliente("20555555552", "Cliente real"), real_vendedor, [(demo_producto, 1)])
        with self.assertRaises(CommandError):
            ejecutar("borrar_demo")
        self.assertEqual(Producto.objects.filter(es_demo=True).count(), 20)  # nada se borró
