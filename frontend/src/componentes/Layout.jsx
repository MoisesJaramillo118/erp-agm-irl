import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Badge, Button, Navbar, Offcanvas } from 'react-bootstrap'
import { useAuth } from '../contexto/AuthContext'
import { menuPara } from '../config/menu'
import { ROLES } from '../config/roles'

function MenuLateral({ onElegir }) {
  const { usuario } = useAuth()
  const secciones = menuPara(usuario.rol)
  return (
    <nav aria-label="Menú principal">
      <NavLink to="/" end onClick={onElegir} className="menu-enlace">Inicio</NavLink>
      {secciones.map((s) => (
        <div key={s.titulo}>
          <div className="menu-seccion">{s.titulo}</div>
          {s.rutas.map((r) => (
            <NavLink key={r.ruta} to={r.ruta} end onClick={onElegir} className="menu-enlace">
              {r.etiqueta}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

// Barra superior azul oscuro «ERP AGM IRL», menú lateral por rol y contenido (como en los prototipos).
export default function Layout() {
  const { usuario, salir } = useAuth()
  const navegar = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const cerrarSesion = () => {
    salir()
    navegar('/login', { replace: true })
  }

  return (
    <div className="app">
      <Navbar className="barra-superior px-3" variant="dark">
        <Button
          variant="outline-light" size="sm" className="d-lg-none me-2"
          aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}
        >
          ☰
        </Button>
        <Navbar.Brand className="fw-bold mb-0">ERP AGM IRL</Navbar.Brand>
        <div className="ms-auto d-flex align-items-center gap-2 text-white">
          <span className="d-none d-sm-inline">{usuario.nombre_completo}</span>
          <Badge bg="light" text="dark">{ROLES[usuario.rol]}</Badge>
          <Button variant="outline-light" size="sm" onClick={cerrarSesion}>Salir</Button>
        </div>
      </Navbar>

      <div className="cuerpo">
        <aside className="menu-lateral d-none d-lg-block">
          <MenuLateral />
        </aside>

        <Offcanvas show={menuAbierto} onHide={() => setMenuAbierto(false)} className="d-lg-none menu-movil">
          <Offcanvas.Header closeButton closeVariant="white">
            <Offcanvas.Title>ERP AGM IRL</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-0">
            <MenuLateral onElegir={() => setMenuAbierto(false)} />
          </Offcanvas.Body>
        </Offcanvas>

        <main className="contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
