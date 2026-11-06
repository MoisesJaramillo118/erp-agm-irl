"""HU01: el gerente crea usuarios con un rol. Cada usuario entra con su contraseña y ve solo el menú de su rol."""
from django.test import TestCase
from rest_framework.test import APIClient

from config.pruebas import api_como, crear_usuario
from usuarios.models import Usuario

CLAVE_NUEVA = "Reparto-Lima-2026"


class HU01CrearUsuariosTest(TestCase):
    def setUp(self):
        self.gerente = crear_usuario("gerente")
        self.api = api_como(self.gerente)

    def _crear(self, username, rol, **extra):
        datos = {"username": username, "first_name": "Ana", "last_name": "Rojas", "rol": rol, "password": CLAVE_NUEVA}
        datos.update(extra)
        return self.api.post("/api/usuarios/", datos, format="json")

    def test_el_gerente_crea_un_usuario_por_rol_y_cada_uno_entra_con_su_rol(self):
        """Criterio: cada usuario ingresa con su contraseña y recibe su rol (el menú se arma con él)."""
        for rol in Usuario.Rol.values:
            r = self._crear(f"nuevo_{rol}", rol)
            self.assertEqual(r.status_code, 201, r.data)
            self.assertNotIn("password", r.data)  # la contraseña nunca se devuelve
            login = APIClient().post("/api/usuarios/login/", {"username": f"nuevo_{rol}", "password": CLAVE_NUEVA},
                                     format="json")
            self.assertEqual(login.status_code, 200)
            self.assertEqual(login.data["usuario"]["rol"], rol)

    def test_la_contrasena_se_guarda_cifrada(self):
        self._crear("cifrado", "vendedor")
        usuario = Usuario.objects.get(username="cifrado")
        self.assertNotEqual(usuario.password, CLAVE_NUEVA)
        self.assertTrue(usuario.check_password(CLAVE_NUEVA))

    def test_solo_el_gerente_puede_crear_usuarios(self):
        for rol in ("vendedor", "almacenero", "repartidor"):
            r = api_como(crear_usuario(rol)).post("/api/usuarios/", {"username": "x", "rol": "gerente",
                                                                     "first_name": "X", "password": CLAVE_NUEVA},
                                                  format="json")
            self.assertEqual(r.status_code, 403, rol)
        self.assertFalse(Usuario.objects.filter(username="x").exists())

    def test_contrasena_debil_o_faltante_se_rechaza(self):
        self.assertEqual(self._crear("debil", "vendedor", password="123").status_code, 400)
        self.assertEqual(self._crear("sin_clave", "vendedor", password="").status_code, 400)

    def test_rol_invalido_se_rechaza(self):
        self.assertEqual(self._crear("raro", "administrador").status_code, 400)

    def test_usuario_desactivado_no_puede_entrar(self):
        self._crear("temporal", "repartidor")
        usuario = Usuario.objects.get(username="temporal")
        r = self.api.patch(f"/api/usuarios/{usuario.pk}/", {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 200)
        login = APIClient().post("/api/usuarios/login/", {"username": "temporal", "password": CLAVE_NUEVA}, format="json")
        self.assertEqual(login.status_code, 401)

    def test_el_gerente_cambia_el_rol_de_un_usuario(self):
        self._crear("cambia", "vendedor")
        usuario = Usuario.objects.get(username="cambia")
        self.api.patch(f"/api/usuarios/{usuario.pk}/", {"rol": "almacenero"}, format="json")
        usuario.refresh_from_db()
        self.assertEqual(usuario.rol, "almacenero")

    def test_el_gerente_no_puede_quitarse_su_propio_acceso(self):
        r = self.api.patch(f"/api/usuarios/{self.gerente.pk}/", {"rol": "vendedor"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.api.patch(f"/api/usuarios/{self.gerente.pk}/", {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_usuarios_creados_por_un_gerente_demo_son_demo(self):
        demo = crear_usuario("gerente", "demo_g")
        demo.es_demo = True
        demo.save()
        api_como(demo).post("/api/usuarios/", {"username": "hijo_demo", "first_name": "H", "rol": "vendedor",
                                               "password": CLAVE_NUEVA}, format="json")
        self.assertTrue(Usuario.objects.get(username="hijo_demo").es_demo)
        self._crear("hijo_real", "vendedor")
        self.assertFalse(Usuario.objects.get(username="hijo_real").es_demo)
