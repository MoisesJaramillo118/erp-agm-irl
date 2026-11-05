from django.test import TestCase
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework.views import APIView
from rest_framework.response import Response

from config.pruebas import crear_usuario
from usuarios.models import Usuario
from usuarios.permissions import SoloGerente, roles_permitidos

CLAVE = "clave-de-prueba-123"


class LoginJWTTest(TestCase):
    def setUp(self):
        self.api = APIClient()

    def test_cada_rol_inicia_sesion_y_recibe_su_rol(self):
        """Cada usuario ingresa con su contraseña y el sistema le informa su rol (base de HU01)."""
        for rol in Usuario.Rol.values:
            crear_usuario(rol)
            r = self.api.post("/api/usuarios/login/", {"username": f"u_{rol}", "password": CLAVE}, format="json")
            self.assertEqual(r.status_code, 200, rol)
            self.assertIn("access", r.data)
            self.assertIn("refresh", r.data)
            self.assertEqual(r.data["usuario"]["rol"], rol)

    def test_contrasena_incorrecta_es_rechazada(self):
        crear_usuario("vendedor")
        r = self.api.post("/api/usuarios/login/", {"username": "u_vendedor", "password": "mala"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_yo_requiere_token_y_devuelve_el_usuario(self):
        self.assertEqual(self.api.get("/api/usuarios/yo/").status_code, 401)
        crear_usuario("almacenero")
        token = self.api.post("/api/usuarios/login/", {"username": "u_almacenero", "password": CLAVE},
                              format="json").data["access"]
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r = self.api.get("/api/usuarios/yo/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["rol"], "almacenero")

    def test_refrescar_entrega_un_nuevo_access(self):
        crear_usuario("repartidor")
        refresh = self.api.post("/api/usuarios/login/", {"username": "u_repartidor", "password": CLAVE},
                                format="json").data["refresh"]
        r = self.api.post("/api/usuarios/refrescar/", {"refresh": refresh}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)


class PermisosPorRolTest(TestCase):
    """El rol se valida en el backend, no solo en el menú."""

    def _vista(self, permiso):
        class Vista(APIView):
            permission_classes = [permiso]

            def get(self, request):
                return Response({"ok": True})

        return Vista.as_view()

    def _llamar(self, vista, usuario=None):
        peticion = APIRequestFactory().get("/")
        if usuario:
            force_authenticate(peticion, user=usuario)
        return vista(peticion).status_code

    def test_solo_los_roles_indicados_pasan(self):
        vista = self._vista(roles_permitidos("almacenero"))
        self.assertEqual(self._llamar(vista, crear_usuario("almacenero")), 200)
        self.assertEqual(self._llamar(vista, crear_usuario("vendedor")), 403)
        self.assertEqual(self._llamar(vista, crear_usuario("repartidor")), 403)

    def test_el_gerente_puede_ver_todo(self):
        gerente = crear_usuario("gerente")
        for rol in ("vendedor", "almacenero", "repartidor"):
            vista = self._vista(roles_permitidos(rol))
            self.assertEqual(self._llamar(vista, gerente), 200, rol)

    def test_sin_sesion_se_rechaza(self):
        vista = self._vista(roles_permitidos("vendedor"))
        self.assertIn(self._llamar(vista), (401, 403))

    def test_solo_gerente(self):
        vista = self._vista(SoloGerente)
        self.assertEqual(self._llamar(vista, crear_usuario("gerente")), 200)
        self.assertEqual(self._llamar(vista, crear_usuario("vendedor")), 403)
