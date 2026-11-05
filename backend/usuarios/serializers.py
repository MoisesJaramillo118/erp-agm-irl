from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    """Datos públicos del usuario que inició sesión."""

    nombre_completo = serializers.CharField(read_only=True)
    rol_display = serializers.CharField(source="get_rol_display", read_only=True)

    class Meta:
        model = Usuario
        fields = ("id", "username", "first_name", "last_name", "nombre_completo", "rol", "rol_display")
        read_only_fields = fields


class TokenConUsuarioSerializer(TokenObtainPairSerializer):
    """Además de los tokens JWT, devuelve el usuario y su rol para armar el menú."""

    def validate(self, attrs):
        datos = super().validate(attrs)
        datos["usuario"] = UsuarioSerializer(self.user).data
        return datos
