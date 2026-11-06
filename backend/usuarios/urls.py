from django.urls import path
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = SimpleRouter()
router.register("", views.UsuarioViewSet, basename="usuario")

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="login"),
    path("refrescar/", TokenRefreshView.as_view(), name="refrescar"),
    path("yo/", views.YoView.as_view(), name="yo"),
] + router.urls
