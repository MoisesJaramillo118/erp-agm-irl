from django.core.management.base import BaseCommand, CommandError

from config import demo


class Command(BaseCommand):
    help = (
        "Crea datos de DEMO (productos, clientes, usuarios por rol, historial sintético con "
        "estacionalidad y pedidos de ejemplo). Todo queda marcado como DEMO; se borra con borrar_demo."
    )

    def add_arguments(self, parser):
        parser.add_argument("--reiniciar", action="store_true",
                            help="Borra los datos DEMO existentes y los crea de nuevo.")
        parser.add_argument("--semanas", type=int, default=104,
                            help="Semanas de historial sintético (por defecto 104 = 2 años).")

    def handle(self, *args, **opciones):
        if demo.hay_datos_demo():
            if not opciones["reiniciar"]:
                raise CommandError("Ya existen datos DEMO. Usa --reiniciar para rehacerlos o borrar_demo para quitarlos.")
            demo.borrar_datos_demo()
            self.stdout.write("Datos DEMO anteriores eliminados.")
        if opciones["semanas"] < 12:
            raise CommandError("Se necesitan al menos 12 semanas de historial.")

        self.stdout.write("Creando datos DEMO...")
        usuarios, contrasena, generada = demo.sembrar_datos_demo(
            semanas=opciones["semanas"], salida=self.stdout.write
        )
        self.stdout.write(self.style.SUCCESS("Datos DEMO creados (todo marcado como DEMO)."))
        self.stdout.write("Usuarios de prueba: " + ", ".join(usuarios))
        if generada:
            self.stdout.write(f"Contraseña generada (anótala, no se vuelve a mostrar): {contrasena}")
        else:
            self.stdout.write("Contraseña: la de DEMO_PASSWORD en tu archivo .env")
