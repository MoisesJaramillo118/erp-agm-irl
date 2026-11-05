from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="login"),
    path("refrescar/", TokenRefreshView.as_view(), name="refrescar"),
    path("yo/", views.YoView.as_view(), name="yo"),
]
