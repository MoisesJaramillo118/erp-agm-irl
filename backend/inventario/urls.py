from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("productos", views.ProductoStockViewSet, basename="producto")
router.register("pedidos", views.PedidoAlmacenViewSet, basename="pedido-almacen")
router.register("movimientos", views.MovimientoViewSet, basename="movimiento")
router.register("conteos", views.ConteoViewSet, basename="conteo")

urlpatterns = [
    path("ingresos/", views.IngresoView.as_view(), name="ingreso"),
    path("categorias/", views.CategoriaView.as_view(), name="categoria"),
    *router.urls,
]
