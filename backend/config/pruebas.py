"""Utilidades compartidas por las pruebas: crea los objetos mínimos sin depender de seed_demo."""
from decimal import Decimal

from inventario.models import Categoria, Producto
from usuarios.models import Usuario
from ventas.models import Cliente


def crear_usuario(rol, username=None, contrasena="clave-de-prueba-123"):
    usuario = Usuario(username=username or f"u_{rol}", rol=rol, first_name=rol.capitalize())
    usuario.set_password(contrasena)
    usuario.save()
    return usuario


def crear_producto(codigo="P-001", precio="10.00", stock=100, minimo=20, categoria="Bolsas"):
    cat, _ = Categoria.objects.get_or_create(nombre=categoria)
    return Producto.objects.create(
        codigo=codigo, descripcion=f"Producto {codigo}", categoria=cat,
        precio=Decimal(precio), stock_actual=stock, stock_minimo=minimo,
    )


def crear_cliente(ruc_dni="20100000001", nombre="Cliente de prueba", distrito="Comas"):
    return Cliente.objects.create(nombre=nombre, ruc_dni=ruc_dni, distrito=distrito)
