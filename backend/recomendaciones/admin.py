from django.contrib import admin

from .models import FactorExplicativo, Pronostico, Recomendacion


class FactorInline(admin.TabularInline):
    model = FactorExplicativo
    extra = 0


@admin.register(Pronostico)
class PronosticoAdmin(admin.ModelAdmin):
    list_display = ("producto", "semana", "demanda_pronosticada", "demanda_real")
    list_filter = ("semana",)
    search_fields = ("producto__codigo", "producto__descripcion")
    inlines = [FactorInline]


@admin.register(Recomendacion)
class RecomendacionAdmin(admin.ModelAdmin):
    list_display = ("pronostico", "cantidad_sugerida", "estado", "fecha")
    list_filter = ("estado",)
