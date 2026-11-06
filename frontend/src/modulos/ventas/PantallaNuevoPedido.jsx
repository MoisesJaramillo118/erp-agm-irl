import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap'
import { api } from '../../api/cliente'
import Avatar from '../../componentes/Avatar'
import Buscador from '../../componentes/Buscador'
import EncabezadoPagina from '../../componentes/EncabezadoPagina'
import EstadoVacio from '../../componentes/EstadoVacio'
import EtiquetaEstado, { estadoStock } from '../../componentes/EtiquetaEstado'
import { useNotificar } from '../../contexto/Notificaciones'
import { formatoFecha, formatoHora, formatoMoneda, hoyLima } from '../../utils/formato'
import FormularioCliente from './FormularioCliente'

// Mensaje de la línea cuando la cantidad no cabe en el disponible (reserva de stock, tesis 7.3).
function avisoCantidad(producto, cantidad) {
  if (!Number.isInteger(cantidad) || cantidad < 1) return 'Escribe una cantidad mayor que cero.'
  const disponible = Math.max(producto.stock_disponible, 0)
  if (cantidad > disponible) return `Solo quedan ${disponible}.`
  return ''
}

function Paso({ numero, completo, children }) {
  return (
    <div className={`paso ${completo ? 'completo' : ''}`}>
      <span className="paso-numero">{completo ? <i className="bi bi-check-lg" /> : numero}</span>
      {children}
    </div>
  )
}

function DisponiblePildora({ producto }) {
  const estado = estadoStock(producto)
  return <EtiquetaEstado estado={estado} texto={estado === 'sin_stock' ? 'Sin stock' : `Disp. ${producto.stock_disponible}`} />
}

const ATAJOS_FECHA = [[1, 'Mañana'], [2, 'Pasado mañana']]

// HU04 (con fecha acordada): el vendedor registra el pedido y lo envía al almacén sin papel.
export default function PantallaNuevoPedido() {
  const notificar = useNotificar()
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
  const total = lineas.reduce((s, l) => s + (l.cantidad || 0) * Number(l.producto.precio), 0)
  const unidades = lineas.reduce((s, l) => s + (l.cantidad || 0), 0)
  const lineasValidas = lineas.length > 0 && !lineas.some((l) => avisoCantidad(l.producto, l.cantidad))
  const fechaValida = Boolean(fecha) && fecha >= hoyLima()
  const puedeRegistrar = cliente && lineasValidas && fechaValida && !enviando

  const agregar = (e) => {
    e.preventDefault()
    if (!producto || yaAgregado || avisoNueva || cantidad === '') return
    setLineas([...lineas, { producto, cantidad: cantidadNumero }])
    setProducto(null)
    setCantidad('')
  }

  const pasoCantidad = (delta) => setCantidad(String(Math.max(1, (Number(cantidad) || 0) + delta)))

  const cambiarCantidad = (id, valor) =>
    setLineas(lineas.map((l) => (l.producto.id === id ? { ...l, cantidad: valor === '' ? NaN : Number(valor) } : l)))

  const registrar = async () => {
    if (!puedeRegistrar) return
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
      notificar(`Pedido ${pedido.numero} enviado al almacén.`)
      setCliente(null)
      setLineas([])
      setFecha(hoyLima(1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
      <Card className="exito-pedido">
        <Card.Body className="p-4 p-md-5">
          <div className="exito-icono"><i className="bi bi-check-lg" aria-hidden="true" /></div>
          <h1 className="h3 mb-1">¡Pedido registrado!</h1>
          <p className="text-secondary">Ya aparece en la pantalla del almacén, sin papel ni traslado.</p>
          <div className="numero-pedido my-3">{registrado.numero}</div>
          <div className="datos my-4">
            <div><div className="dato-etiqueta">Cliente</div><div className="dato-valor">{registrado.cliente_nombre}</div><div className="small text-secondary">{registrado.distrito}</div></div>
            <div><div className="dato-etiqueta">Total</div><div className="dato-valor fs-5">{formatoMoneda(registrado.total)}</div></div>
            <div><div className="dato-etiqueta">Hora de registro</div><div className="dato-valor">{formatoHora(registrado.hora_registro)}</div><div className="small text-secondary">La puso el sistema</div></div>
            <div><div className="dato-etiqueta">Entrega acordada</div><div className="dato-valor">{formatoFecha(registrado.fecha_acordada)}</div></div>
          </div>
          <div className="mb-4"><EtiquetaEstado estado={registrado.estado} /></div>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            <Button size="lg" onClick={() => setRegistrado(null)}><i className="bi bi-plus-lg" /> Registrar otro pedido</Button>
            <Link to="/ventas/stock" className="btn btn-light btn-lg border">Ver stock</Link>
          </div>
        </Card.Body>
      </Card>
    )
  }

  const botonRegistrar = (clase = '') => (
    <Button size="lg" className={clase} disabled={!puedeRegistrar} onClick={registrar}>
      {enviando ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-send" /> Registrar y enviar al almacén</>}
    </Button>
  )

  return (
    <>
      <EncabezadoPagina icono="bi-cart-plus" titulo="Nuevo pedido"
        descripcion="Elige al cliente, agrega los productos y la fecha acordada. El pedido llega al almacén al instante." />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="d-flex gap-2">
          <i className="bi bi-exclamation-triangle mt-1" aria-hidden="true" /><div>{error}</div>
        </Alert>
      )}

      <Row className="g-4">
        <Col lg={7}>
          <Card className="mb-4">
            <Card.Header><Paso numero={1} completo={!!cliente}>Cliente</Paso></Card.Header>
            <Card.Body>
              {cliente ? (
                <div className="seleccionado">
                  <Avatar nombre={cliente.nombre} tamano="lg" />
                  <div className="min-w-0 flex-grow-1">
                    <div className="fw-semibold">{cliente.nombre}{cliente.es_demo && <EtiquetaEstado estado="demo" />}</div>
                    <div className="small text-secondary tabular">{cliente.ruc_dni.length === 11 ? 'RUC' : 'DNI'} {cliente.ruc_dni}</div>
                    <div className="small text-secondary"><i className="bi bi-geo-alt me-1" />{cliente.distrito}{cliente.direccion && ` · ${cliente.direccion}`}</div>
                  </div>
                  <Button size="sm" variant="light" className="border" onClick={() => setCliente(null)}>Cambiar</Button>
                </div>
              ) : (
                <>
                  <Form.Label htmlFor="buscar-cliente" className="fw-medium">Busca por nombre o RUC/DNI</Form.Label>
                  <Buscador
                    id="buscar-cliente" ruta="/ventas/clientes/" placeholder="Ej.: Bodega, 20…" onElegir={setCliente}
                    pie={<Button size="sm" variant="link" className="p-0" onClick={() => setCreandoCliente(true)}>Registrar como cliente nuevo</Button>}
                    renderizar={(c) => (
                      <div className="d-flex align-items-center gap-2">
                        <Avatar nombre={c.nombre} tamano="sm" />
                        <div className="min-w-0">
                          <div className="fw-semibold">{c.nombre}</div>
                          <div className="small text-secondary">{c.ruc_dni} · {c.distrito}</div>
                        </div>
                      </div>
                    )}
                  />
                  <Button variant="link" className="px-0 mt-2" onClick={() => setCreandoCliente(true)}>
                    <i className="bi bi-person-plus" /> ¿Cliente nuevo? Regístralo aquí
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header><Paso numero={2} completo={lineas.length > 0}>Productos</Paso></Card.Header>
            <Card.Body>
              {producto ? (
                <Form onSubmit={agregar}>
                  <div className="seleccionado mb-3">
                    <div className="icono-producto tono-cian" aria-hidden="true"><i className="bi bi-box-seam" /></div>
                    <div className="min-w-0 flex-grow-1">
                      <div className="fw-semibold">{producto.descripcion}</div>
                      <div className="small text-secondary">{producto.codigo} · {formatoMoneda(producto.precio)} por {producto.unidad}</div>
                      <div className="small mt-1">Disponible: <strong className="tabular">{producto.stock_disponible}</strong></div>
                    </div>
                    <Button size="sm" variant="light" className="border" onClick={() => { setProducto(null); setCantidad('') }}>Cambiar</Button>
                  </div>
                  {yaAgregado ? (
                    <Alert variant="info" className="py-2 mb-0 d-flex justify-content-between align-items-center gap-2">
                      <span>Este producto ya está en el pedido: cambia su cantidad en el resumen.</span>
                      <Button size="sm" variant="light" onClick={() => setProducto(null)}>Elegir otro</Button>
                    </Alert>
                  ) : (
                    <>
                      <div className="d-flex flex-wrap gap-2 align-items-start">
                        <InputGroup className="selector-cantidad" hasValidation>
                          <Button variant="light" className="border" onClick={() => pasoCantidad(-1)} aria-label="Restar uno"><i className="bi bi-dash-lg" /></Button>
                          <Form.Control
                            type="number" min={1} step={1} inputMode="numeric" placeholder="0" aria-label="Cantidad"
                            value={cantidad} onChange={(e) => setCantidad(e.target.value)} isInvalid={!!avisoNueva} autoFocus
                          />
                          <Button variant="light" className="border" onClick={() => pasoCantidad(1)} aria-label="Sumar uno"><i className="bi bi-plus-lg" /></Button>
                        </InputGroup>
                        <Button type="submit" disabled={!cantidad || !!avisoNueva}><i className="bi bi-cart-plus" /> Agregar</Button>
                      </div>
                      {avisoNueva && (
                        <div className="text-danger small fw-semibold mt-2" role="alert">
                          <i className="bi bi-exclamation-circle me-1" aria-hidden="true" />{avisoNueva}
                        </div>
                      )}
                    </>
                  )}
                </Form>
              ) : (
                <>
                  <Form.Label htmlFor="buscar-producto" className="fw-medium">Busca por código o descripción</Form.Label>
                  <Buscador
                    id="buscar-producto" ruta="/inventario/productos/" placeholder="Ej.: vaso, bolsa con asa…"
                    onElegir={setProducto} autoFocus={lineas.length > 0}
                    renderizar={(p) => (
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div className="min-w-0">
                          <div className="fw-semibold">{p.descripcion}</div>
                          <div className="small text-secondary">{p.codigo} · {formatoMoneda(p.precio)}</div>
                        </div>
                        <DisponiblePildora producto={p} />
                      </div>
                    )}
                  />
                  <div className="small text-secondary mt-2">
                    <i className="bi bi-info-circle me-1" aria-hidden="true" />El disponible ya descuenta lo reservado por otros pedidos.
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="resumen-pedido">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Paso numero={3} completo={puedeRegistrar}>Resumen del pedido</Paso>
              {lineas.length > 0 && <span className="small text-secondary">{lineas.length} producto(s) · {unidades || 0} und.</span>}
            </Card.Header>
            {lineas.length === 0 ? (
              <EstadoVacio icono="bi-cart" tono="azul" titulo="Aún no hay productos">Búscalos en el paso 2 y agrégalos con su cantidad.</EstadoVacio>
            ) : (
              lineas.map((l) => {
                const aviso = avisoCantidad(l.producto, l.cantidad)
                return (
                  <div className="linea-pedido" key={l.producto.id}>
                    <div className="min-w-0 flex-grow-1">
                      <div className="linea-nombre">{l.producto.descripcion}</div>
                      <div className="small text-secondary">{formatoMoneda(l.producto.precio)} c/u · disp. {l.producto.stock_disponible}</div>
                      {aviso && <div className="small text-danger fw-semibold">{aviso}</div>}
                    </div>
                    <Form.Control
                      size="sm" type="number" min={1} inputMode="numeric" className="linea-cantidad text-center"
                      aria-label={`Cantidad de ${l.producto.descripcion}`} isInvalid={!!aviso}
                      value={Number.isNaN(l.cantidad) ? '' : l.cantidad}
                      onChange={(e) => cambiarCantidad(l.producto.id, e.target.value)}
                    />
                    <div className="linea-subtotal">{formatoMoneda((l.cantidad || 0) * Number(l.producto.precio))}</div>
                    <Button size="sm" variant="link" className="text-danger px-1" aria-label={`Quitar ${l.producto.descripcion}`}
                      onClick={() => setLineas(lineas.filter((x) => x.producto.id !== l.producto.id))}>
                      <i className="bi bi-trash3" />
                    </Button>
                  </div>
                )
              })
            )}
            <div className="total-pedido">
              <span className="fw-semibold text-secondary">Total</span>
              <span className="monto">{formatoMoneda(total)}</span>
            </div>
            <Card.Body className="border-top">
              <Form.Label htmlFor="fecha-acordada" className="fw-medium">Fecha de entrega acordada con el cliente</Form.Label>
              <div className="chips mb-2">
                {ATAJOS_FECHA.map(([dias, nombre]) => (
                  <button type="button" key={dias} className={`chip ${fecha === hoyLima(dias) ? 'activo' : ''}`} onClick={() => setFecha(hoyLima(dias))}>
                    {nombre} <span className="cuenta">{formatoFecha(hoyLima(dias)).slice(0, 5)}</span>
                  </button>
                ))}
              </div>
              <Form.Control id="fecha-acordada" type="date" value={fecha} min={hoyLima()} onChange={(e) => setFecha(e.target.value)}
                isInvalid={!fechaValida} />
              <Form.Control.Feedback type="invalid">Elige una fecha de hoy en adelante.</Form.Control.Feedback>
              {fechaValida && <Form.Text muted>Se entregará el {formatoFecha(fecha)}.</Form.Text>}

              <ul className="lista-chequeo mb-3">
                {[
                  [!!cliente, 'Cliente elegido'],
                  [lineas.length > 0, 'Al menos un producto'],
                  [lineas.length > 0 && lineasValidas, 'Cantidades dentro del disponible'],
                  [fechaValida, 'Fecha de entrega acordada'],
                ].map(([ok, texto]) => (
                  <li key={texto} className={ok ? 'ok' : ''}>
                    <i className={`bi ${ok ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" />{texto}
                  </li>
                ))}
              </ul>
              {botonRegistrar('w-100 d-none d-lg-flex')}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="barra-movil d-lg-none">
        <div>
          <div className="small text-secondary">Total · {lineas.length} producto(s)</div>
          <div className="monto">{formatoMoneda(total)}</div>
        </div>
        <Button className="ms-auto" disabled={!puedeRegistrar} onClick={registrar}>
          {enviando ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-send" /> Registrar</>}
        </Button>
      </div>

      {creandoCliente && (
        <FormularioCliente onCerrar={() => setCreandoCliente(false)} onGuardado={(c) => { setCliente(c); setCreandoCliente(false) }} />
      )}
    </>
  )
}
