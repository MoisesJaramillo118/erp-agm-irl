import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Col, Form, Placeholder, ProgressBar, Row, Spinner, Table } from 'react-bootstrap'
import { api } from '../../api/cliente'
import EncabezadoPagina from '../../componentes/EncabezadoPagina'
import EstadoVacio from '../../componentes/EstadoVacio'
import EtiquetaEstado from '../../componentes/EtiquetaEstado'
import { useNotificar } from '../../contexto/Notificaciones'
import { formatoFecha, formatoHora, hoyLima } from '../../utils/formato'

// La lista se vuelve a pedir sola cada 10 segundos (HU05: «cada pedido nuevo aparece apenas se registra»).
const CADA_MS = 10000

function minutosDesde(fecha, ahora) {
  return Math.max(0, Math.floor((ahora - new Date(fecha)) / 60000))
}

function textoEspera(minutos) {
  if (minutos < 1) return 'recién llegado'
  if (minutos < 60) return `espera ${minutos} min`
  return `espera ${Math.floor(minutos / 60)} h ${minutos % 60} min`
}

function textoMinutos(minutos) {
  if (minutos == null) return '—'
  const m = Math.round(minutos)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

// Píldora de la fecha de entrega acordada con el cliente.
function Entrega({ fecha }) {
  if (!fecha) return null
  const hoy = hoyLima()
  let texto = `Entrega ${formatoFecha(fecha)}`
  let clase = 'neutra'
  if (fecha < hoy) [texto, clase] = ['Entrega vencida', 'peligro']
  else if (fecha === hoy) [texto, clase] = ['Entrega hoy', 'alerta']
  else if (fecha === hoyLima(1)) [texto, clase] = ['Entrega mañana', 'primario']
  return <span className={`pildora pildora-${clase}`}><i className="bi bi-truck" aria-hidden="true" />{texto}</span>
}

function hace(segundos) {
  if (segundos < 5) return 'ahora'
  if (segundos < 60) return `hace ${segundos} s`
  return `hace ${Math.floor(segundos / 60)} min`
}

// HU05: el almacenero ve los pedidos pendientes en el orden en que llegan, sin papel.
// HU06: confirma el pedido preparado; el sistema descuenta el stock y guarda la hora de conformidad.
export default function PantallaPedidosAlmacen() {
  const notificar = useNotificar()
  const [pendientes, setPendientes] = useState([])
  const [conformes, setConformes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [actualizado, setActualizado] = useState(null)
  const [ahora, setAhora] = useState(Date.now())
  const [seleccionado, setSeleccionado] = useState(null)
  const [listos, setListos] = useState({}) // {idPedido: [idProducto, ...]}
  const [nuevos, setNuevos] = useState([])
  const [confirmando, setConfirmando] = useState(false)
  const conocidos = useRef(null)
  const detalleRef = useRef(null)

  const cargar = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api('/inventario/pedidos/?por_pagina=200'),
        api('/inventario/pedidos/?conformes_hoy=1&por_pagina=50'),
      ])
      // Los pedidos que no estaban en la carga anterior son nuevos: se resaltan y se avisa.
      if (conocidos.current) {
        const llegados = p.results.filter((x) => !conocidos.current.has(x.id))
        if (llegados.length === 1) notificar(`Llegó el pedido ${llegados[0].numero} de ${llegados[0].cliente_nombre}.`, 'info')
        if (llegados.length > 1) notificar(`Llegaron ${llegados.length} pedidos nuevos.`, 'info')
        if (llegados.length) setNuevos((n) => [...n, ...llegados.map((x) => x.id)])
      } else {
        conocidos.current = new Set()
      }
      p.results.forEach((x) => conocidos.current.add(x.id))
      setPendientes(p.results)
      setConformes(c.results)
      setSeleccionado((s) => (p.results.some((x) => x.id === s) ? s : p.results[0]?.id ?? null))
      setActualizado(Date.now())
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [notificar])

  // Carga inicial, recarga periódica (solo con la pestaña visible) y reloj para «hace N s».
  useEffect(() => {
    cargar()
    const recarga = setInterval(() => document.visibilityState === 'visible' && cargar(), CADA_MS)
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    const alVolver = () => document.visibilityState === 'visible' && cargar()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(recarga)
      clearInterval(reloj)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar])

  const pedido = pendientes.find((p) => p.id === seleccionado) || null
  const listosDelPedido = pedido ? listos[pedido.id] || [] : []
  const todosListos = !!pedido && pedido.detalles.every((d) => listosDelPedido.includes(d.producto))

  const elegir = (id) => {
    setSeleccionado(id)
    setNuevos((n) => n.filter((x) => x !== id))
    if (window.innerWidth < 992) setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const alternar = (idProducto) => {
    if (!pedido) return
    const actuales = listos[pedido.id] || []
    const siguientes = actuales.includes(idProducto) ? actuales.filter((x) => x !== idProducto) : [...actuales, idProducto]
    setListos({ ...listos, [pedido.id]: siguientes })
  }

  const marcarTodo = () => pedido && setListos({ ...listos, [pedido.id]: pedido.detalles.map((d) => d.producto) })

  const confirmar = async () => {
    if (!pedido || !todosListos) return
    setConfirmando(true)
    try {
      const hecho = await api(`/inventario/pedidos/${pedido.id}/confirmar/`, { metodo: 'POST' })
      notificar(`Pedido ${hecho.numero} conforme a las ${formatoHora(hecho.hora_conformidad)} · atendido en ${textoMinutos(hecho.tiempo_atencion)}.`)
      const resto = pendientes.filter((p) => p.id !== pedido.id)
      setPendientes(resto)
      setConformes((c) => [hecho, ...c])
      setSeleccionado(resto[0]?.id ?? null)
    } catch (e) {
      notificar(e.message, 'error')
      cargar()
    } finally {
      setConfirmando(false)
    }
  }

  const segundos = actualizado ? Math.floor((ahora - actualizado) / 1000) : 0

  return (
    <>
      <EncabezadoPagina icono="bi-clipboard-check" titulo="Pedidos por preparar"
        descripcion="Los pedidos llegan en el orden en que se registran; ya no se imprimen ni se llevan en papel.">
        <span className="en-vivo" title="La lista se actualiza sola cada 10 segundos">
          <span className="pulso" aria-hidden="true" />Se actualiza sola · {actualizado ? hace(segundos) : '…'}
        </span>
        <Button variant="light" className="border" onClick={cargar}><i className="bi bi-arrow-clockwise" /> Actualizar</Button>
      </EncabezadoPagina>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4">
        <Col lg={6} xl={7}>
          <Card className="tarjeta-tabla mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">En cola</span>
              <span className="small text-secondary">{pendientes.length} pedido(s) · el más antiguo primero</span>
            </Card.Header>
            {cargando && [1, 2, 3].map((i) => (
              <div className="fila-cola" key={i}><Placeholder animation="glow" className="w-100"><Placeholder xs={12} /></Placeholder></div>
            ))}
            {!cargando && pendientes.length === 0 && (
              <EstadoVacio icono="bi-check2-all" tono="verde" titulo="No hay pedidos por preparar">
                Cuando un vendedor registre un pedido, aparecerá aquí en unos segundos.
              </EstadoVacio>
            )}
            <div className="cola-pedidos">
              {pendientes.map((p, i) => {
                const espera = minutosDesde(p.hora_registro, ahora)
                return (
                  <button type="button" key={p.id} onClick={() => elegir(p.id)}
                    className={`fila-cola ${p.id === seleccionado ? 'activa' : ''} ${nuevos.includes(p.id) ? 'nueva' : ''}`}
                    aria-current={p.id === seleccionado ? 'true' : undefined}>
                    <span className="turno" aria-label={`Turno ${i + 1}`}>{i + 1}</span>
                    <span className="min-w-0 flex-grow-1">
                      <span className="d-flex flex-wrap align-items-center gap-2">
                        <strong className="tabular">{p.numero}</strong>
                        {nuevos.includes(p.id) && <EtiquetaEstado estado="nuevo" />}
                        {p.es_demo && <EtiquetaEstado estado="demo" />}
                      </span>
                      <span className="d-block">{p.cliente_nombre}</span>
                      <span className="d-block sub"><i className="bi bi-geo-alt me-1" aria-hidden="true" />{p.distrito} · {p.detalles.length} producto(s)</span>
                    </span>
                    <span className="text-end flex-shrink-0">
                      <span className="d-block fw-semibold tabular">{formatoHora(p.hora_registro)}</span>
                      <span className={`d-block small ${espera >= 60 ? 'text-danger fw-semibold' : 'text-secondary'}`}>{textoEspera(espera)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="tarjeta-tabla">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold"><i className="bi bi-check2-circle text-success me-1" aria-hidden="true" />Conformes de hoy</span>
              <span className="small text-secondary">{conformes.length} pedido(s)</span>
            </Card.Header>
            {conformes.length === 0 ? (
              <p className="text-secondary small px-4 py-3 mb-0">Aún no hay pedidos confirmados hoy.</p>
            ) : (
              <Table responsive className="tabla-agm mb-0">
                <thead>
                  <tr><th>Pedido</th><th>Conformidad</th><th className="text-end">Atención</th></tr>
                </thead>
                <tbody>
                  {conformes.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="fw-semibold tabular">{p.numero}</div>
                        <div className="sub">{p.cliente_nombre} · registrado {formatoHora(p.hora_registro)}</div>
                      </td>
                      <td><EtiquetaEstado estado="conforme" texto={`Conforme ${formatoHora(p.hora_conformidad)}`} /></td>
                      <td className="text-end tabular fw-semibold text-nowrap">{textoMinutos(p.tiempo_atencion)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </Col>

        <Col lg={6} xl={5} ref={detalleRef}>
          <Card className="resumen-pedido">
            {!pedido ? (
              <EstadoVacio icono="bi-clipboard" tono="gris" titulo="Elige un pedido">
                Sus productos aparecerán aquí para que los prepares y confirmes.
              </EstadoVacio>
            ) : (
              <>
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="min-w-0">
                      <div className="small text-secondary">Pedido</div>
                      <div className="h5 mb-0 fw-bold tabular">{pedido.numero}</div>
                    </div>
                    <Entrega fecha={pedido.fecha_acordada} />
                  </div>
                  <div className="mt-2 fw-semibold">{pedido.cliente_nombre}{pedido.es_demo && <EtiquetaEstado estado="demo" />}</div>
                  <div className="small text-secondary">
                    <i className="bi bi-geo-alt me-1" aria-hidden="true" />{pedido.distrito} · Vendedor: {pedido.vendedor_nombre}
                  </div>
                  <div className="small text-secondary">
                    <i className="bi bi-clock me-1" aria-hidden="true" />Registrado a las {formatoHora(pedido.hora_registro)} ({textoEspera(minutosDesde(pedido.hora_registro, ahora))})
                  </div>
                </Card.Header>
                <Table className="tabla-agm mb-0 tabla-preparar">
                  <thead>
                    <tr><th>Producto</th><th className="text-end">Cantidad</th><th className="text-center">Listo</th></tr>
                  </thead>
                  <tbody>
                    {pedido.detalles.map((d) => {
                      const listo = listosDelPedido.includes(d.producto)
                      return (
                        <tr key={d.producto} className={listo ? 'listo' : ''} onClick={() => alternar(d.producto)}>
                          <td>
                            <div className="fw-semibold nombre">{d.descripcion}</div>
                            <div className="sub">{d.codigo}</div>
                          </td>
                          <td className="text-end text-nowrap">
                            <span className="fw-bold fs-6 tabular">{d.cantidad}</span> <span className="sub">{d.unidad}</span>
                          </td>
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Form.Check className="check-listo d-inline-block" id={`listo-${d.producto}`} checked={listo}
                              onChange={() => alternar(d.producto)} aria-label={`Listo: ${d.descripcion}`} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
                <Card.Body className="border-top">
                  <div className="d-flex justify-content-between align-items-center small mb-1">
                    <span className="text-secondary">{listosDelPedido.length} de {pedido.detalles.length} productos listos</span>
                    {!todosListos && <Button variant="link" size="sm" className="p-0" onClick={marcarTodo}>Marcar todo</Button>}
                  </div>
                  <ProgressBar now={(listosDelPedido.length / pedido.detalles.length) * 100} variant="success" className="progreso-listos mb-3" />
                  <p className="small text-secondary mb-3">
                    <i className="bi bi-info-circle me-1" aria-hidden="true" />
                    Al confirmar, el stock se descuenta y se guarda la hora de conformidad. Ya no hace falta firmar el papel.
                  </p>
                  <Button variant="success" size="lg" className="w-100" disabled={!todosListos || confirmando} onClick={confirmar}>
                    {confirmando ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-check2-circle" /> Confirmar pedido preparado</>}
                  </Button>
                  {!todosListos && <div className="small text-secondary text-center mt-2">Marca cada producto cuando lo tengas listo.</div>}
                </Card.Body>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </>
  )
}
