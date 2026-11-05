from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """Usuario del sistema. Extiende AbstractUser (nombre, usuario, contraseña) con un rol."""

    class Rol(models.TextChoices):
        VENDEDOR = "vendedor", "Vendedor"
        ALMACENERO = "almacenero", "Almacenero"
        REPARTIDOR = "repartidor", "Repartidor"
        GERENTE = "gerente", "Gerente"

    rol = models.CharField("rol", max_length=12, choices=Rol.choices, default=Rol.VENDEDOR)
    # Marca los usuarios creados por seed_demo, para poder borrarlos sin tocar los reales.
    es_demo = models.BooleanField("dato DEMO", default=False, db_index=True)

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    @property
    def nombre_completo(self):
        return self.get_full_name() or self.username

    def __str__(self):
        return f"{self.nombre_completo} ({self.get_rol_display()})"
