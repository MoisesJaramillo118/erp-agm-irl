from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "ERP AGM IRL — Administración"
admin.site.site_title = "ERP AGM IRL"
admin.site.index_title = "Administración del sistema"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/usuarios/", include("usuarios.urls")),
    path("api/ventas/", include("ventas.urls")),
    path("api/inventario/", include("inventario.urls")),
    path("api/distribucion/", include("distribucion.urls")),
    path("api/recomendaciones/", include("recomendaciones.urls")),
]
