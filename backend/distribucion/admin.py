from django.contrib import admin

from .models import Entrega


@admin.register(Entrega)
class EntregaAdmin(admin.ModelAdmin):
    list_display = ("pedido", "repartidor", "fecha_acordada", "fecha_entrega", "conformidad_cliente")
    list_filter = ("conformidad_cliente",)
    search_fields = ("pedido__numero", "pedido__cliente__nombre")
