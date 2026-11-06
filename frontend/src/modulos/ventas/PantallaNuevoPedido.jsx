import { useState } from 'react'
import { Alert, Button, Card, Col, Form, InputGroup, Row, Spinner, Table } from 'react-bootstrap'
import { api } from '../../api/cliente'
import Buscador from '../../componentes/Buscador'
import EtiquetaEstado from '../../componentes/EtiquetaEstado'
import { formatoFecha, formatoHora, formatoMoneda, hoyLima } from '../../utils/formato'
import FormularioCliente from './FormularioCliente'

// Mensaje de la línea cuando la cantidad no cabe en el disponible (reserva de stock, tesis 7.3).
function avisoCantidad(producto, cantidad) {
  if (!Number.isInteger(cantidad) || cantidad < 1) return 'Escribe una cantidad mayor que cero.'
  const disponible = Math.max(producto.stock_disponible, 0)
  if (cantidad > disponible) return `Solo quedan ${disponible}.`
  return ''
}

// HU04 (y fecha acordada): el vendedor registra el pedido y lo envía al almacén sin papel (Fig. 12).
export default function PantallaNuevoPedido() {
  const [cliente, setCliente] = useState(null)
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [producto, setProducto] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [lineas, setLineas] = useState([])
  const [fecha, setFecha] = useState(hoyLima(1))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [registrado, setRegistrado] = useState(null)

  const cantidadNumero = Number(cantidad)
  const yaAgregado = producto && lineas.some((l) => l.producto.id === producto.id)
  const avisoNueva = producto && cantidad !== '' ? avisoCantidad(producto, cantidadNumero) : ''
  const total = lineas.reduce((s, l) => s + l.cantidad * Number(l.producto.precio), 0)
  const hayLineaInvalida = lineas.some((l) => avisoCantidad(l.producto, l.cantidad))
  const puedeRegistrar = cliente && lineas.length > 0 && !hayLineaInvalida && fecha >= hoyLima() && !enviando

  const agregar = (e) => {
    e.preventDefault()
    if (!producto || yaAgregado || avisoNueva || cantidad === '') return
    setLineas([...lineas, { producto, cantidad: cantidadNumero }])
    setProducto(null)
    setCantidad('')
  }

  const cambiarCantidad = (id, valor) =>
    setLineas(lineas.map((l) => (l.producto.id === id ? { ...l, cantidad: Number(valor) } : l)))

  const registrar = async () => {
    setEnviando(true)
    setError('')
    try {
      const pedido = await api('/ventas/pedidos/', {
        metodo: 'POST',
        cuerpo: {
          cliente: cliente.id,
          fecha_acordada: fecha,
          detalles: lineas.map((l) => ({ producto: l.producto.id, cantidad: l.cantidad })),
        },
      })
      setRegistrado(pedido)
      setCliente(null)
      setLineas([])
      setFecha(hoyLima(1))
    } catch (err) {
      // Si otro vendedor tomó el stock mientras tanto, se actualiza el disponible de esas líneas.
      const faltantes = err.datos?.faltantes || []
      if (faltantes.length) {
        setLineas((actuales) => actuales.map((l) => {
          const f = faltantes.find((x) => x.producto === l.producto.id)
          return f ? { ...l, producto: { ...l.producto, stock_disponible: f.disponible } } : l
        }))
      }
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (registrado) {
    return (
      <>
        <h1 className="h4 mb-3">Registro de pedido</h1>
        <Alert variant="success">
          <Alert.Heading className="h5">Pedido {registrado.numero} registrado</Alert.Heading>
          <p className="mb-1">
            Cliente: <strong>{registrado.cliente_nombre}</strong> ({registrado.distrito}) · Total:{' '}
            <strong>{formatoMoneda(registrado.total)}</strong>
          </p>
          <p className="mb-1">
            Hora de registro: <strong>{formatoHora(registrado.hora_registro)}</strong> · Entrega acordada:{' '}
            <strong>{formatoFecha(registrado.fecha_acordada)}</strong>
          </p>
          <p className="mb-0">El pedido ya aparece en la pantalla del almacén. <EtiquetaEstado estado={registrado.estado} /></p>
        </Alert>
        <Button onClick={() => setRegistrado(null)}>Registrar otro pedido</Button>
      </>
    )
  }

  return (
    <>
      <h1 className="h4 mb-3">Registro de pedido</h1>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      <Row className="g-3">
        <Col lg={6}>
          <Card className="mb-3">
            <Card.Header className="fw-semibold">1. Cliente</Card.Header>
            <Card.Body>
              {cliente ? (
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div className="fw-semibold">{cliente.nombre} {cliente.es_demo && <EtiquetaEstado estado="demo" />}</div>
                    <div className="small text-muted">{cliente.ruc_dni} · {cliente.distrito}</div>
                    {cliente.direccion && <div className="small text-muted">{cliente.direccion}</div>}
                  </div>
                  <Button size="sm" variant="outline-secondary" onClick={() => setCliente(null)}>Cambiar</Button>
                </div>
              ) : (
                <>
                  <Form.Label htmlFor="buscar-cliente">Buscar por nombre o RUC/DNI</Form.Label>
                  <Buscador
                    id="buscar-cliente" ruta="/ventas/clientes/" placeholder="Ej.: Bodega, 20…"
                    onElegir={setCliente}
                    renderizar={(c) => (
                      <><span className="fw-semibold">{c.nombre}</span> <span className="small text-muted">· {c.ruc_dni} · {c.distrito}</span></>
                    )}
                  />
                  <Button variant="link" className="px-0 mt-1" onClick={() => setCreandoCliente(true)}>+ Registrar cliente nuevo</Button>
                </>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header className="fw-semibold">2. Productos</Card.Header>
            <Card.Body>
              {producto ? (
                <Form onSubmit={agregar}>
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <div className="fw-semibold">{producto.descripcion}</div>
                      <div className="small text-muted">
                        {producto.codigo} · {formatoMoneda(producto.precio)} · Disponible: <strong>{producto.stock_disponible}</strong>
                      </div>
                    </div>
                    <Button size="sm" variant="outline-secondary" onClick={() => { setProducto(null); setCantidad('') }}>Cambiar</Button>
                  </div>
                  {yaAgregado ? (
                    <Alert variant="info" className="py-2 mb-0">Este producto ya está en el pedido; cambia su cantidad en la lista.</Alert>
                  ) : (
                    <InputGroup hasValidation>
                      <Form.Control
                        type="number" min={1} step={1} inputMode="numeric" placeholder="Cantidad" aria-label="Cantidad"
                        value={cantidad} onChange={(e) => setCantidad(e.target.value)} isInvalid={!!avisoNueva} autoFocus
                      />
                      <Button type="submit" disabled={!cantidad || !!avisoNueva}>Agregar</Button>
                      <Form.Control.Feedback type="invalid">{avisoNueva}</Form.Control.Feedback>
                    </InputGroup>
                  )}
                </Form>
              ) : (
                <>
                  <Form.Label htmlFor="buscar-producto">Buscar por código o descripción</Form.Label>
                  <Buscador
                    id="buscar-producto" ruta="/inventario/productos/" placeholder="Ej.: vaso, bolsa…"
                    onElegir={setProducto}
                    renderizar={(p) => (
                      <div className="d-flex justify-content-between gap-2">
                        <span>{p.descripcion} <span className="small text-muted">· {p.codigo}</span></span>
                        <span className={`small text-nowrap ${p.stock_disponible > 0 ? 'text-success' : 'text-danger'}`}>
                          Disp. {p.stock_disponible}
                        </span>
                      </div>
                    )}
                  />
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card>
            <Card.Header className="fw-semibold">3. Detalle del pedido</Card.Header>
            <Table responsive className="mb-0 align-middle">
              <thead>
                <tr><th>Producto</th><th style={{ width: '7rem' }}>Cantidad</th><th className="text-end">Subtotal</th><th /></tr>
              </thead>
              <tbody>
                {lineas.map((l) => {
                  const aviso = avisoCantidad(l.producto, l.cantidad)
                  return (
                    <tr key={l.producto.id}>
                      <td>
                        {l.producto.descripcion}
                        <div className="small text-muted">{formatoMoneda(l.producto.precio)} c/u · disp. {l.producto.stock_disponible}</div>
                      </td>
                      <td>
                        <Form.Control
                          size="sm" type="number" min={1} inputMode="numeric" aria-label={`Cantidad de ${l.producto.descripcion}`}
                          value={Number.isNaN(l.cantidad) ? '' : l.cantidad} isInvalid={!!aviso}
                          onChange={(e) => cambiarCantidad(l.producto.id, e.target.value)}
                        />
                        <Form.Control.Feedback type="invalid" className="d-block">{aviso}</Form.Control.Feedback>
                      </td>
                      <td className="text-end text-nowrap">{formatoMoneda(l.cantidad * Number(l.producto.precio) || 0)}</td>
                      <td className="text-end">
                        <Button size="sm" variant="outline-danger" aria-label="Quitar"
                          onClick={() => setLineas(lineas.filter((x) => x.producto.id !== l.producto.id))}>✕</Button>
                      </td>
                    </tr>
                  )
                })}
                {lineas.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">Agrega productos al pedido.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={2} className="text-end">Total</th>
                  <th className="text-end text-nowrap fs-5">{formatoMoneda(total)}</th>
                  <th />
                </tr>
              </tfoot>
            </Table>
            <Card.Body className="border-top">
              <Form.Group controlId="fecha-acordada" className="mb-3">
                <Form.Label>Fecha de entrega acordada con el cliente</Form.Label>
                <Form.Control type="date" value={fecha} min={hoyLima()} onChange={(e) => setFecha(e.target.value)}
                  isInvalid={fecha < hoyLima()} />
                <Form.Text muted>{fecha ? `Se entregará el ${formatoFecha(fecha)}.` : ''}</Form.Text>
                <Form.Control.Feedback type="invalid">La fecha no puede ser anterior a hoy.</Form.Control.Feedback>
              </Form.Group>
              <Button size="lg" className="w-100" disabled={!puedeRegistrar} onClick={registrar}>
                {enviando ? <Spinner size="sm" animation="border" /> : 'Registrar pedido y enviar al almacén'}
              </Button>
              {!cliente && <div className="small text-muted mt-2 text-center">Primero elige al cliente.</div>}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {creandoCliente && (
        <FormularioCliente
          onCerrar={() => setCreandoCliente(false)}
          onGuardado={(c) => { setCliente(c); setCreandoCliente(false) }}
        />
      )}
    </>
  )
}
