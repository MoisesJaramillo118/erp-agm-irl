from django.core.management.base import BaseCommand, CommandError
from django.db.models import ProtectedError

from config import demo


class Command(BaseCommand):
    help = "Borra todos los datos marcados como DEMO (y solo ésos). Los datos reales no se tocan."

    def handle(self, *args, **opciones):
        try:
            borrados = demo.borrar_datos_demo()
        except ProtectedError as error:
            raise CommandError(
                "No se borró nada: algún dato real depende de un dato DEMO. Detalle: " + str(error)
            )
        for etiqueta, cantidad in borrados.items():
            self.stdout.write(f"  {etiqueta}: {cantidad} registros")
        self.stdout.write(self.style.SUCCESS("Datos DEMO eliminados."))
