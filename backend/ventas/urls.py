from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("clientes", views.ClienteViewSet, basename="cliente")
router.register("pedidos", views.PedidoViewSet, basename="pedido")

urlpatterns = router.urls
