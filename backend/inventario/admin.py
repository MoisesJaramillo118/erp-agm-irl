from django.contrib import admin

from .models import Categoria, ConteoFisico, DetalleConteo, MovimientoInventario, Producto


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    search_fields = ("nombre",)


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "descripcion", "categoria", "precio", "stock_actual", "stock_minimo", "es_demo")
    list_filter = ("categoria", "es_demo")
    search_fields = ("codigo", "descripcion")


@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = ("fecha_hora", "producto", "tipo", "cantidad", "usuario")
    list_filter = ("tipo",)
    search_fields = ("producto__codigo", "producto__descripcion")
    date_hierarchy = "fecha_hora"


class DetalleConteoInline(admin.TabularInline):
    model = DetalleConteo
    extra = 0


@admin.register(ConteoFisico)
class ConteoFisicoAdmin(admin.ModelAdmin):
    list_display = ("fecha", "usuario", "es_demo")
    inlines = [DetalleConteoInline]
