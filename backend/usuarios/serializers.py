from django.contrib.auth.password_validation import validate_password
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


class UsuarioGestionSerializer(serializers.ModelSerializer):
    """El gerente crea y edita usuarios con un rol (HU01). La contraseña nunca se devuelve."""

    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False,
                                     style={"input_type": "password"})
    nombre_completo = serializers.CharField(read_only=True)
    rol_display = serializers.CharField(source="get_rol_display", read_only=True)

    class Meta:
        model = Usuario
        fields = ("id", "username", "first_name", "last_name", "nombre_completo", "rol", "rol_display",
                  "is_active", "password", "es_demo")
        read_only_fields = ("es_demo",)
        extra_kwargs = {"first_name": {"required": True, "allow_blank": False}}

    def validate(self, attrs):
        instancia = self.instance
        password = attrs.get("password")
        if instancia is None and not password:
            raise serializers.ValidationError({"password": "Escribe una contraseña para el nuevo usuario."})
        if password:
            prueba = instancia or Usuario(username=attrs.get("username", ""), first_name=attrs.get("first_name", ""),
                                          last_name=attrs.get("last_name", ""))
            try:
                validate_password(password, prueba)
            except Exception as error:  # django.core.exceptions.ValidationError
                raise serializers.ValidationError({"password": list(error.messages)})
        # El gerente no puede quitarse a sí mismo el rol ni desactivarse (se quedaría sin acceso).
        actual = self.context["request"].user
        if instancia is not None and instancia.pk == actual.pk:
            if attrs.get("rol", instancia.rol) != Usuario.Rol.GERENTE or attrs.get("is_active", True) is False:
                raise serializers.ValidationError("No puedes quitarte el rol de gerente ni desactivar tu propio usuario.")
        return attrs

    def create(self, datos):
        password = datos.pop("password")
        usuario = Usuario(**datos)
        # Los usuarios que crea un gerente DEMO también son DEMO.
        usuario.es_demo = self.context["request"].user.es_demo
        usuario.set_password(password)
        usuario.save()
        return usuario

    def update(self, usuario, datos):
        password = datos.pop("password", None)
        for campo, valor in datos.items():
            setattr(usuario, campo, valor)
        if password:
            usuario.set_password(password)
        usuario.save()
        return usuario
