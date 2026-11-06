from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("productos", views.ProductoStockViewSet, basename="producto")

# Los endpoints del almacén (HU05 a HU08) se agregan en el Sprint 2.
urlpatterns = router.urls
