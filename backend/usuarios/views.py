from rest_framework import mixins, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .permissions import SoloGerente
from .serializers import TokenConUsuarioSerializer, UsuarioGestionSerializer, UsuarioSerializer


class LoginView(TokenObtainPairView):
    """POST usuario + contraseña → tokens JWT y datos del usuario (con su rol)."""

    serializer_class = TokenConUsuarioSerializer


class YoView(APIView):
    """GET → datos del usuario autenticado."""

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)


class UsuarioViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin,
                     mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Gestión de usuarios y roles (HU01). Solo el gerente. Los usuarios no se borran: se desactivan."""

    serializer_class = UsuarioGestionSerializer
    permission_classes = [SoloGerente]

    def get_queryset(self):
        qs = Usuario.objects.order_by("rol", "username")
        q = self.request.query_params.get("q", "").strip()
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(username__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q))
        return qs
