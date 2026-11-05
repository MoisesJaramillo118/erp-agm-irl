"""Permisos por rol. El rol se valida aquí, en el backend, y no solo en el menú del frontend.

Uso en una vista:

    class PedidosView(APIView):
        permission_classes = [roles_permitidos("vendedor", "almacenero")]

El gerente puede ver todo, así que siempre pasa la validación.
"""
from rest_framework.permissions import BasePermission

from .models import Usuario


def roles_permitidos(*roles):
    """Devuelve una clase de permiso que acepta a los usuarios autenticados con alguno de los roles dados
    (y siempre al gerente)."""
    permitidos = {*roles, Usuario.Rol.GERENTE}

    class TieneRol(BasePermission):
        message = "Tu rol no tiene permiso para esta acción."

        def has_permission(self, request, view):
            usuario = request.user
            return bool(usuario and usuario.is_authenticated and usuario.rol in permitidos)

    TieneRol.__name__ = "TieneRol_" + "_".join(sorted(str(r) for r in permitidos))
    return TieneRol


class SoloGerente(BasePermission):
    """Acceso exclusivo del gerente (por ejemplo, la gestión de usuarios)."""

    message = "Solo el gerente puede realizar esta acción."

    def has_permission(self, request, view):
        usuario = request.user
        return bool(usuario and usuario.is_authenticated and usuario.rol == Usuario.Rol.GERENTE)
