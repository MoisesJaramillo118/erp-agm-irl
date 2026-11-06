import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Col, Placeholder, Row } from 'react-bootstrap'
import { api } from '../api/cliente'
import { useAuth } from '../contexto/AuthContext'
import { menuPara } from '../config/menu'
import { INFO_ROLES, ROLES } from '../config/roles'
import { fechaDeHoy, saludo } from '../utils/formato'

// Cifras del resumen según el rol. Cada una sale de la API (``count`` con por_pagina=1).
const PEDIDOS_EN_ALMACEN = { ruta: '/ventas/pedidos/?estado=en_almacen', icono: 'bi-hourglass-split', tono: 'ambar' }
const BAJO_MINIMO = { ruta: '/inventario/productos/?estado=bajo_minimo', icono: 'bi-exclamation-triangle', tono: 'ambar', enlace: '/ventas/stock?estado=bajo_minimo', etiqueta: 'Productos bajo mínimo' }
const SIN_STOCK = { ruta: '/inventario/productos/?estado=sin_stock', icono: 'bi-x-octagon', tono: 'rojo', enlace: '/ventas/stock?estado=sin_stock', etiqueta: 'Productos sin stock' }

const RESUMEN = {
  vendedor: [
    { ...PEDIDOS_EN_ALMACEN, etiqueta: 'Mis pedidos en almacén' },
    BAJO_MINIMO,
    SIN_STOCK,
    { ruta: '/ventas/clientes/', icono: 'bi-people', tono: 'violeta', etiqueta: 'Clientes registrados', enlace: '/ventas/clientes' },
  ],
  almacenero: [
    { ...PEDIDOS_EN_ALMACEN, etiqueta: 'Pedidos por preparar', enlace: '/inventario/pedidos' },
    { ...BAJO_MINIMO, enlace: null },
    { ...SIN_STOCK, enlace: null },
  ],
  gerente: [
    { ...PEDIDOS_EN_ALMACEN, etiqueta: 'Pedidos en almacén' },
    BAJO_MINIMO,
    SIN_STOCK,
    { ruta: '/usuarios/', icono: 'bi-person-badge', tono: 'azul', etiqueta: 'Usuarios del sistema', enlace: '/usuarios' },
  ],
  repartidor: [],
}

function Indicador({ ruta, icono, tono, etiqueta, enlace }) {
  const [valor, setValor] = useState(null)
  useEffect(() => {
    let vigente = true
    const separador = ruta.includes('?') ? '&' : '?'
    api(`${ruta}${separador}por_pagina=1`)
      .then((d) => vigente && setValor(d.count))
      .catch(() => vigente && setValor('—'))
    return () => {
      vigente = false
    }
  }, [ruta])

  const contenido = (
    <div className="indicador">
      <div className={`indicador-icono tono-${tono}`} aria-hidden="true"><i className={`bi ${icono}`} /></div>
      <div>
        <div className="indicador-valor">
          {valor === null ? <Placeholder animation="glow"><Placeholder xs={6} /></Placeholder> : valor}
        </div>
        <div className="indicador-etiqueta">{etiqueta}</div>
      </div>
    </div>
  )
  return enlace ? <Card as={Link} to={enlace} className="h-100 text-decoration-none">{contenido}</Card> : <Card className="h-100">{contenido}</Card>
}

export default function Inicio() {
  const { usuario } = useAuth()
  const info = INFO_ROLES[usuario.rol]
  const secciones = menuPara(usuario.rol)
  const resumen = RESUMEN[usuario.rol] || []

  return (
    <>
      <section className="saludo mb-4">
        <i className={`bi ${info.icono} saludo-icono`} aria-hidden="true" />
        <p className="small mb-1">{fechaDeHoy()}</p>
        <h1>{saludo()}, {usuario.first_name || usuario.username}</h1>
        <p>Entraste como <strong className="text-white">{ROLES[usuario.rol]}</strong>. {info.desc}</p>
      </section>

      {resumen.length > 0 && (
        <>
          <h2 className="h6 text-uppercase text-secondary fw-semibold mb-3" style={{ letterSpacing: '.06em' }}>Resumen de hoy</h2>
          <Row xs={1} sm={2} xl={4} className="g-3 mb-4">
            {resumen.map((r) => <Col key={r.etiqueta}><Indicador {...r} /></Col>)}
          </Row>
        </>
      )}

      {secciones.map((s) => (
        <div key={s.titulo} className="mb-4">
          <h2 className="h6 text-uppercase text-secondary fw-semibold mb-3" style={{ letterSpacing: '.06em' }}>{s.titulo}</h2>
          <Row xs={1} md={2} xl={3} className="g-3">
            {s.rutas.map((r) => (
              <Col key={r.ruta}>
                <Card as={Link} to={r.ruta} className="h-100 text-decoration-none">
                  <div className="acceso">
                    <div className={`acceso-icono tono-${r.sprint ? 'gris' : r.tono}`} aria-hidden="true"><i className={`bi ${r.icono}`} /></div>
                    <div className="min-w-0">
                      <div className="acceso-titulo">{r.etiqueta}</div>
                      <div className="acceso-desc">{r.desc}</div>
                      {r.sprint && (
                        <span className="pildora pildora-neutra mt-2"><i className="bi bi-clock" aria-hidden="true" />Llega en el Sprint {r.sprint}</span>
                      )}
                    </div>
                    <i className="bi bi-chevron-right acceso-flecha" aria-hidden="true" />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </>
  )
}
