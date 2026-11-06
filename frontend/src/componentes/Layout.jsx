import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Dropdown, Offcanvas } from 'react-bootstrap'
import { useAuth } from '../contexto/AuthContext'
import { menuPara, ubicar } from '../config/menu'
import { INFO_ROLES, ROLES } from '../config/roles'
import Avatar from './Avatar'
import Logo from './Logo'

function Marca() {
  return (
    <>
      <Logo />
      <div>
        <div className="marca-nombre">ERP AGM IRL</div>
        <div className="marca-sub">Corporación AGM E.I.R.L.</div>
      </div>
    </>
  )
}

// Menú lateral: solo las pantallas del rol. Las que aún no se construyen llevan «Pronto».
function Navegacion({ onElegir }) {
  const { usuario } = useAuth()
  return (
    <nav aria-label="Menú principal">
      <NavLink to="/" end onClick={onElegir} className="nav-enlace">
        <i className="bi bi-house" aria-hidden="true" /> Inicio
      </NavLink>
      {menuPara(usuario.rol).map((s) => (
        <div key={s.titulo}>
          <div className="nav-seccion">{s.titulo}</div>
          {s.rutas.map((r) => (
            <NavLink key={r.ruta} to={r.ruta} end onClick={onElegir} className={`nav-enlace ${r.sprint ? 'pendiente' : ''}`}>
              <i className={`bi ${r.icono}`} aria-hidden="true" />
              <span>{r.etiqueta}</span>
              {r.sprint && <span className="pronto" title={`Se construye en el Sprint ${r.sprint}`}>Pronto</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

function MenuUsuario({ onSalir }) {
  const { usuario } = useAuth()
  const info = INFO_ROLES[usuario.rol]
  return (
    <Dropdown align="end" className="menu-usuario">
      <Dropdown.Toggle id="menu-usuario" aria-label="Menú del usuario">
        <Avatar nombre={usuario.nombre_completo} color={info.color} tamano="sm" />
        <span className="d-none d-md-block text-start">
          <span className="usuario-nombre d-block">{usuario.nombre_completo}</span>
          <span className="usuario-rol d-block">{ROLES[usuario.rol]}</span>
        </span>
      </Dropdown.Toggle>
      <Dropdown.Menu className="shadow">
        <Dropdown.Header>
          <div className="fw-semibold text-body">{usuario.nombre_completo}</div>
          <div className="small">@{usuario.username} · {ROLES[usuario.rol]}</div>
        </Dropdown.Header>
        <Dropdown.Divider />
        <Dropdown.Item as="button" onClick={onSalir}>
          <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />Cerrar sesión
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  )
}

// Estructura de todas las pantallas: barra lateral por rol, barra superior y contenido.
export default function Layout() {
  const { salir } = useAuth()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const lugar = ubicar(pathname)

  const cerrarSesion = () => {
    salir()
    navegar('/login', { replace: true })
  }

  return (
    <div className="app">
      <aside className="lateral">
        <div className="lateral-marca"><Marca /></div>
        <div className="lateral-nav"><Navegacion /></div>
        <div className="lateral-pie">© 2026 Corporación AGM E.I.R.L.</div>
      </aside>

      <Offcanvas show={menuAbierto} onHide={() => setMenuAbierto(false)} className="lateral-movil">
        <Offcanvas.Header closeButton closeVariant="white">
          <div className="lateral-marca border-0 p-0 h-auto"><Marca /></div>
        </Offcanvas.Header>
        <Offcanvas.Body className="lateral-nav">
          <Navegacion onElegir={() => setMenuAbierto(false)} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="principal">
        <header className="barra-superior">
          <Button size="sm" className="boton-menu btn-icono d-lg-none" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>
            <i className="bi bi-list fs-5" />
          </Button>
          <div className="d-flex d-lg-none align-items-center gap-2 fw-bold">
            <Logo tamano={28} /> <span>ERP AGM IRL</span>
          </div>
          <div className="miga d-none d-lg-flex">
            {lugar ? (
              <>
                <span>{lugar.seccion}</span>
                <i className="bi bi-chevron-right small" aria-hidden="true" />
                <strong>{lugar.pantalla}</strong>
              </>
            ) : (
              <strong>Inicio</strong>
            )}
          </div>
          <div className="ms-auto">
            <MenuUsuario onSalir={cerrarSesion} />
          </div>
        </header>

        <main className="contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
