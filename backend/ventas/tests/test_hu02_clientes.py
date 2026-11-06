"""HU02: el vendedor registra y busca clientes. Se encuentran por nombre o RUC/DNI y se guardan con su distrito."""
from django.test import TestCase

from config.pruebas import api_como, crear_cliente, crear_usuario
from ventas.models import Cliente


class HU02ClientesTest(TestCase):
    def setUp(self):
        self.vendedor = crear_usuario("vendedor")
        self.api = api_como(self.vendedor)

    def test_registra_cliente_con_su_distrito(self):
        r = self.api.post("/api/ventas/clientes/", {
            "nombre": "Bodega  El Sol", "ruc_dni": "20123456789", "telefono": "987654321",
            "direccion": "Av. Los Pinos 123", "distrito": "San Juan de Lurigancho", "tipo": "intermedio",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        cliente = Cliente.objects.get(ruc_dni="20123456789")
        self.assertEqual(cliente.distrito, "San Juan de Lurigancho")
        self.assertEqual(cliente.nombre, "Bodega El Sol")  # espacios de más se limpian
        self.assertFalse(cliente.es_demo)

    def test_busca_por_nombre_parcial_sin_importar_mayusculas(self):
        crear_cliente("20111111111", "Bodega El Sol")
        crear_cliente("20222222222", "Distribuidora Norte")
        r = self.api.get("/api/ventas/clientes/?q=el sol")
        self.assertEqual([c["nombre"] for c in r.data["results"]], ["Bodega El Sol"])

    def test_busca_por_ruc_o_dni(self):
        crear_cliente("20111111111", "Bodega El Sol")
        crear_cliente("45678912", "Juana Díaz")
        self.assertEqual(self.api.get("/api/ventas/clientes/?q=20111111111").data["results"][0]["nombre"], "Bodega El Sol")
        self.assertEqual(self.api.get("/api/ventas/clientes/?q=4567").data["results"][0]["nombre"], "Juana Díaz")

    def test_valida_ruc_dni_y_distrito(self):
        base = {"nombre": "X", "distrito": "Comas", "tipo": "final"}
        for doc in ("123", "1234567890", "2012345678A"):
            r = self.api.post("/api/ventas/clientes/", {**base, "ruc_dni": doc}, format="json")
            self.assertEqual(r.status_code, 400, doc)
        r = self.api.post("/api/ventas/clientes/", {**base, "ruc_dni": "12345678", "distrito": ""}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_no_permite_ruc_dni_repetido(self):
        crear_cliente("20111111111")
        r = self.api.post("/api/ventas/clientes/", {"nombre": "Otro", "ruc_dni": "20111111111", "distrito": "Ate"},
                          format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Ya hay un cliente", str(r.data))

    def test_edita_cliente_sin_chocar_con_su_propio_ruc(self):
        c = crear_cliente("20111111111")
        r = self.api.patch(f"/api/ventas/clientes/{c.pk}/", {"ruc_dni": "20111111111", "distrito": "Ate"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        c.refresh_from_db()
        self.assertEqual(c.distrito, "Ate")

    def test_almacenero_y_repartidor_no_acceden_a_clientes(self):
        for rol in ("almacenero", "repartidor"):
            self.assertEqual(api_como(crear_usuario(rol)).get("/api/ventas/clientes/").status_code, 403, rol)
        self.assertEqual(api_como(crear_usuario("gerente")).get("/api/ventas/clientes/").status_code, 200)
