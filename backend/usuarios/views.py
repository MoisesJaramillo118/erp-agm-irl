from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import TokenConUsuarioSerializer, UsuarioSerializer


class LoginView(TokenObtainPairView):
    """POST usuario + contraseña → tokens JWT y datos del usuario (con su rol)."""

    serializer_class = TokenConUsuarioSerializer


class YoView(APIView):
    """GET → datos del usuario autenticado."""

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)
