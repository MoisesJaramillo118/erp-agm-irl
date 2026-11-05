from django.contrib import admin

from .models import Cliente, DetallePedido, Pedido


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nombre", "ruc_dni", "distrito", "tipo", "telefono", "es_demo")
    list_filter = ("tipo", "distrito", "es_demo")
    search_fields = ("nombre", "ruc_dni")


class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 0


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ("numero", "cliente", "vendedor", "hora_registro", "hora_conformidad", "estado", "total", "es_demo")
    list_filter = ("estado", "es_demo")
    search_fields = ("numero", "cliente__nombre", "cliente__ruc_dni")
    readonly_fields = ("numero", "hora_registro", "hora_conformidad")
    inlines = [DetallePedidoInline]
