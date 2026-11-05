from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ("username", "first_name", "last_name", "rol", "is_active", "es_demo")
    list_filter = ("rol", "is_active", "es_demo")
    fieldsets = UserAdmin.fieldsets + (("Rol en el ERP", {"fields": ("rol", "es_demo")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Rol en el ERP", {"fields": ("first_name", "last_name", "rol")}),
    )
