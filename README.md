# ERP AGM IRL

Sistema modular de ERP con inteligencia artificial explicable para la Corporación AGM IRL (Lima).
Proyecto de la tesis de Ingeniería de Sistemas (UTP). El diseño (historias de usuario, arquitectura, modelo de datos y modelo predictivo) está en la sección 8 del documento de la tesis.

| Capa | Tecnología |
|---|---|
| Presentación | React 18 + Vite, React Router, Bootstrap 5 (React-Bootstrap), Recharts |
| Lógica de negocio | Python 3.11, Django 5 y Django REST Framework (API REST en JSON), autenticación JWT |
| Datos | **Una sola base de datos común** en PostgreSQL 16 (Docker) |
| Modelo | pandas, LightGBM, SHAP y openpyxl |

Apps del backend: `usuarios`, `ventas`, `inventario`, `distribucion` y `recomendaciones`. Cada una expone sus endpoints en `/api/<modulo>/`.

## Estado por sprint

| Sprint | Contenido | Estado |
|---|---|---|
| 0 | Preparación: repositorio, Docker, 13 modelos, JWT, admin, `seed_demo`, React con inicio de sesión y menú por rol | ✅ listo — [Sprint Review](docs/sprints/sprint-0/review.md) |
| 1 | Ventas (HU01 a HU04): usuarios y roles, clientes, stock disponible con reserva, registro de pedido | ✅ listo — [Sprint Review](docs/sprints/sprint-1/review.md) |
| 2 | Inventario (HU05 a HU08) | pendiente |
| 3 | Distribución (HU09 a HU11) | pendiente |
| 4 | Recomendaciones explicadas (HU12 a HU15) | pendiente |

La evidencia de cada sprint (Sprint Review y capturas de las pantallas) está en [`docs/sprints/`](docs/sprints/).

## Requisitos

- Python 3.11
- Node.js 20 o superior (npm incluido)
- Docker Desktop (para PostgreSQL)
- Git

## Cómo ejecutar el sistema

Todos los comandos se ejecutan desde la carpeta del proyecto (`erp-agm-irl`), salvo que se indique otra.

### 1. Configuración (una sola vez)

1. Copia `.env.example` como `.env` y completa `DB_PASSWORD`, `DJANGO_SECRET_KEY` y, si quieres, `DEMO_PASSWORD`.
   El archivo `.env` **no se sube a git**.
2. Levanta PostgreSQL:

   ```powershell
   docker compose up -d db
   ```

### 2. Backend (Django)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser        # para entrar al admin de Django (/admin/)
python manage.py seed_demo              # datos de DEMO: productos, usuarios, historial sintético
python manage.py runserver              # API en http://localhost:8000
```

### 3. Frontend (React)

En otra terminal:

```powershell
cd frontend
npm install
npm run dev                             # abre http://localhost:5173
```

En desarrollo, Vite envía las llamadas `/api` al servidor Django, así que no hace falta configurar nada más.

## Usuarios de prueba (solo DEMO)

`seed_demo` crea un usuario por rol. Todos usan la contraseña definida en `DEMO_PASSWORD` de tu `.env`
(si la dejaste vacía, el comando genera una y la muestra una sola vez).

| Usuario | Rol | Qué ve |
|---|---|---|
| `demo_vendedor` | Vendedor | Nuevo pedido, clientes, consulta de stock disponible |
| `demo_almacenero` | Almacenero | Pedidos por preparar, ingreso de mercadería, conteo físico |
| `demo_repartidor` | Repartidor | Entregas programadas |
| `demo_gerente` | Gerente | Todo, más recomendaciones, reportes y administración de usuarios |

## Datos DEMO

- Los precios, el stock, los clientes y las ventas de `seed_demo` son **inventados**. Todo lo que crea queda marcado como DEMO
  (`es_demo = True`; los códigos de producto empiezan con `DEMO-` y los números de pedido con `D-` o `DH-`).
- El historial sintético tiene estacionalidad (más ventas en julio y diciembre) para poder entrenar el modelo mientras llega el historial real.
- Para borrarlos, sin tocar datos reales:

  ```powershell
  python manage.py borrar_demo
  ```

  Si algún dato real depende de un dato DEMO, el comando no borra nada y lo avisa.
- `python manage.py seed_demo --reiniciar` borra los datos DEMO y los crea de nuevo.

## Pruebas

```powershell
cd backend
python manage.py test                   # pruebas del backend (TestCase de Django)
cd ..\frontend
npm run build                           # el frontend debe compilar sin errores
```

## Convenciones

- Interfaz en español; fechas dd/mm/aaaa, moneda en S/ y zona horaria America/Lima.
- `hora_registro` y `hora_conformidad` de cada pedido las pone el sistema, nunca el usuario.
- **Reserva de stock** (tesis 7.3 y Tabla IV): stock disponible = `stock_actual` − cantidades de los pedidos en estado
  `en_almacen`. Al registrar un pedido, cada línea debe caber en el disponible («Solo quedan N»). `stock_actual` baja
  recién cuando el almacén confirma el pedido (HU06).
- Lo que crea un usuario DEMO (clientes, pedidos, usuarios) también queda marcado como DEMO.
- El rol se valida en el backend en cada endpoint; el menú del frontend solo es una ayuda visual. El gerente puede ver todo.
- No se suben contraseñas ni datos reales de la empresa al repositorio (`.env`, `*.xlsx` y los modelos entrenados están en `.gitignore`).
