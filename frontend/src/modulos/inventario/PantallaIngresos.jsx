import { useState } from 'react'
import { Alert, Button, Card, Col, Form, InputGroup, Placeholder, Row, Spinner, Table } from 'react-bootstrap'
import { api } from '../../api/cliente'
import Buscador from '../../componentes/Buscador'
import CampoBusqueda from '../../componentes/CampoBusqueda'
import EncabezadoPagina from '../../componentes/EncabezadoPagina'
import EstadoVacio from '../../componentes/EstadoVacio'
import EtiquetaEstado from '../../componentes/EtiquetaEstado'
import Paso from '../../componentes/Paso'
import { useNotificar } from '../../contexto/Notificaciones'
import useDebounce from '../../hooks/useDebounce'
import useListaPaginada from '../../hooks/useListaPaginada'
import { formatoFechaHora } from '../../utils/formato'

const TIPOS = [
  ['', 'Todos'],
  ['entrada', 'Entradas'],
  ['salida', 'Salidas'],
  ['ajuste', 'Ajustes'],
]
const SUMAS_RAPIDAS = [10, 50, 100]

// Cantidad con signo: + en entradas, − en salidas; los ajustes ya traen su signo.
function CantidadMovimiento({ m }) {
  const valor = m.tipo === 'salida' ? -m.cantidad : m.cantidad
  return <span className={`fw-bold tabular ${valor >= 0 ? 'text-success' : 'text-danger'}`}>{valor > 0 ? '+' : valor < 0 ? '−' : ''}{Math.abs(valor)}</span>
}

// HU07: el almacenero registra el ingreso de mercadería. El stock sube y queda en el historial de movimientos.
export default function PantallaIngresos() {
  const notificar = useNotificar()
  const [producto, setProducto] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [lineas, setLineas] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [ultimo, setUltimo] = useState(null)
  const [tipo, setTipo] = useState('')
  const [texto, setTexto] = useState('')
  const q = useDebounce(texto.trim())
  const historial = useListaPaginada('/inventario/movimientos/', { tipo, q })

  const numero = Number(cantidad)
  const cantidadValida = Number.isInteger(numero) && numero >= 1
  const yaAgregado = producto && lineas.some((l) => l.producto.id === producto.id)
  const unidades = lineas.reduce((s, l) => s + (l.cantidad || 0), 0)
  const lineasValidas = lineas.every((l) => Number.isInteger(l.cantidad) && l.cantidad >= 1)

  const agregar = (e) => {
    e.preventDefault()
    if (!producto || !cantidadValida || yaAgregado) return
    setLineas([...lineas, { producto, cantidad: numero }])
    setProducto(null)
    setCantidad('')
  }

  const cambiarCantidad = (id, valor) =>
    setLineas(lineas.map((l) => (l.producto.id === id ? { ...l, cantidad: valor === '' ? NaN : Number(valor) } : l)))

  const registrar = async () => {
    if (!lineas.length || !lineasValidas) return
    setEnviando(true)
    setError('')
    try {
      const r = await api('/inventario/ingresos/', {
        metodo: 'POST',
        cuerpo: { detalles: lineas.map((l) => ({ producto: l.producto.id, cantidad: l.cantidad })) },
      })
      const nuevos = Object.fromEntries(r.productos.map((p) => [p.id, p.stock_actual]))
      setUltimo(lineas.map((l) => ({ ...l, antes: l.producto.stock_actual, despues: nuevos[l.producto.id] })))
      notificar(`Ingreso registrado: ${lineas.length} producto(s), +${unidades} und.`)
      setLineas([])
      historial.recargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <EncabezadoPagina icono="bi-box-arrow-in-down" titulo="Ingreso de mercadería"
        descripcion="Registra lo que llega al almacén. El stock sube al instante y el ingreso queda en el historial de movimientos." />

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header><Paso numero={1} completo={lineas.length > 0}>Producto y cantidad</Paso></Card.Header>
            <Card.Body>
              {producto ? (
                <Form onSubmit={agregar}>
                  <div className="seleccionado mb-3">
                    <div className="icono-producto tono-verde" aria-hidden="true"><i className="bi bi-box-seam" /></div>
                    <div className="min-w-0 flex-grow-1">
                      <div className="fw-semibold">{producto.descripcion}{producto.es_demo && <EtiquetaEstado estado="demo" />}</div>
                      <div className="small text-secondary">{producto.codigo} · {producto.unidad}</div>
                      <div className="small mt-1">En almacén: <strong className="tabular">{producto.stock_actual}</strong> · mín. {producto.stock_minimo}</div>
                    </div>
                    <Button size="sm" variant="light" className="border" onClick={() => { setProducto(null); setCantidad('') }}>Cambiar</Button>
                  </div>
                  {yaAgregado ? (
                    <Alert variant="info" className="py-2 mb-0 d-flex justify-content-between align-items-center gap-2">
                      <span>Este producto ya está en el ingreso: cambia su cantidad a la derecha.</span>
                      <Button size="sm" variant="light" onClick={() => setProducto(null)}>Elegir otro</Button>
                    </Alert>
                  ) : (
                    <>
                      <Form.Label htmlFor="cantidad-ingreso" className="fw-medium">¿Cuántas unidades llegaron?</Form.Label>
                      <div className="d-flex flex-wrap gap-2 align-items-start">
                        <InputGroup className="selector-cantidad">
                          <Button variant="light" className="border" aria-label="Restar uno"
                            onClick={() => setCantidad(String(Math.max(1, (Number(cantidad) || 0) - 1)))}><i className="bi bi-dash-lg" /></Button>
                          <Form.Control id="cantidad-ingreso" type="number" min={1} step={1} inputMode="numeric" placeholder="0"
                            aria-label="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus />
                          <Button variant="light" className="border" aria-label="Sumar uno"
                            onClick={() => setCantidad(String((Number(cantidad) || 0) + 1))}><i className="bi bi-plus-lg" /></Button>
                        </InputGroup>
                        <Button type="submit" variant="success" disabled={!cantidadValida}><i className="bi bi-plus-circle" /> Agregar</Button>
                      </div>
                      <div className="chips mt-2" aria-label="Sumar rápido">
                        {SUMAS_RAPIDAS.map((n) => (
                          <button type="button" key={n} className="chip" onClick={() => setCantidad(String((Number(cantidad) || 0) + n))}>+{n}</button>
                        ))}
                      </div>
                      {cantidadValida && (
                        <div className="small text-secondary mt-2">
                          El stock en almacén pasará de <strong>{producto.stock_actual}</strong> a <strong className="text-success">{producto.stock_actual + numero}</strong>.
                        </div>
                      )}
                    </>
                  )}
                </Form>
              ) : (
                <>
                  <Form.Label htmlFor="buscar-producto" className="fw-medium">Busca por código o descripción</Form.Label>
                  <Buscador
                    id="buscar-producto" ruta="/inventario/productos/" placeholder="Ej.: vaso, bolsa con asa…" onElegir={setProducto}
                    autoFocus={lineas.length > 0}
                    renderizar={(p) => (
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div className="min-w-0">
                          <div className="fw-semibold">{p.descripcion}</div>
                          <div className="small text-secondary">{p.codigo} · {p.unidad}</div>
                        </div>
                        <span className="small text-secondary text-nowrap">En almacén: <strong className="tabular">{p.stock_actual}</strong></span>
                      </div>
                    )}
                  />
                  <div className="small text-secondary mt-2">
                    <i className="bi bi-info-circle me-1" aria-hidden="true" />Puedes agregar varios productos y registrarlos juntos.
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Paso numero={2} completo={false}>Ingreso a registrar</Paso>
              {lineas.length > 0 && <span className="small text-secondary">{lineas.length} producto(s) · +{unidades || 0} und.</span>}
            </Card.Header>
            {ultimo && lineas.length === 0 && (
              <Alert variant="success" className="m-3 mb-0" dismissible onClose={() => setUltimo(null)}>
                <div className="fw-semibold mb-1"><i className="bi bi-check-circle-fill me-1" />Ingreso registrado. Stock actualizado:</div>
                {ultimo.map((l) => (
                  <div key={l.producto.id} className="small">
                    {l.producto.descripcion}: {l.antes} → <strong>{l.despues}</strong> (+{l.cantidad})
                  </div>
                ))}
              </Alert>
            )}
            {lineas.length === 0 ? (
              !ultimo && <EstadoVacio icono="bi-inbox" tono="verde" titulo="Aún no hay productos">Búscalos a la izquierda y agrégalos con la cantidad que llegó.</EstadoVacio>
            ) : (
              lineas.map((l) => (
                <div className="linea-pedido" key={l.producto.id}>
                  <div className="min-w-0 flex-grow-1">
                    <div className="linea-nombre">{l.producto.descripcion}</div>
                    <div className="small text-secondary tabular">
                      Stock: {l.producto.stock_actual} → <strong className="text-success">{l.producto.stock_actual + (l.cantidad || 0)}</strong>
                    </div>
                  </div>
                  <Form.Control size="sm" type="number" min={1} inputMode="numeric" className="linea-cantidad text-center"
                    aria-label={`Cantidad de ${l.producto.descripcion}`} isInvalid={!(Number.isInteger(l.cantidad) && l.cantidad >= 1)}
                    value={Number.isNaN(l.cantidad) ? '' : l.cantidad} onChange={(e) => cambiarCantidad(l.producto.id, e.target.value)} />
                  <Button size="sm" variant="link" className="text-danger px-1" aria-label={`Quitar ${l.producto.descripcion}`}
                    onClick={() => setLineas(lineas.filter((x) => x.producto.id !== l.producto.id))}>
                    <i className="bi bi-trash3" />
                  </Button>
                </div>
              ))
            )}
            <Card.Body className="border-top mt-auto">
              {error && <Alert variant="danger" className="py-2">{error}</Alert>}
              <Button variant="success" size="lg" className="w-100" disabled={!lineas.length || !lineasValidas || enviando} onClick={registrar}>
                {enviando ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-box-arrow-in-down" /> Registrar ingreso</>}
              </Button>
              <div className="small text-secondary text-center mt-2">La fecha, la hora y tu usuario los pone el sistema.</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="tarjeta-tabla">
        <Card.Header>
          <div className="fw-semibold mb-2"><i className="bi bi-clock-history me-1" aria-hidden="true" />Historial de movimientos</div>
          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
            <div className="chips" role="group" aria-label="Filtrar por tipo">
              {TIPOS.map(([valor, nombre]) => (
                <button type="button" key={nombre} className={`chip ${tipo === valor ? 'activo' : ''}`} onClick={() => setTipo(valor)}>{nombre}</button>
              ))}
            </div>
            <CampoBusqueda valor={texto} onCambiar={setTexto} placeholder="Buscar producto…" etiqueta="Buscar en el historial" className="flex-grow-1" />
          </div>
        </Card.Header>
        <Table responsive hover className="tabla-agm">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th className="text-end">Cantidad</th>
              <th className="d-none d-md-table-cell">Usuario</th>
            </tr>
          </thead>
          <tbody>
            {historial.cargando && historial.items.length === 0 && [1, 2, 3].map((i) => (
              <tr key={i}><td colSpan={5}><Placeholder animation="glow"><Placeholder xs={12} /></Placeholder></td></tr>
            ))}
            {historial.items.map((m) => (
              <tr key={m.id}>
                <td className="text-nowrap tabular">{formatoFechaHora(m.fecha_hora)}</td>
                <td>
                  <div className="fw-semibold">{m.descripcion}</div>
                  <div className="sub">{m.codigo}</div>
                </td>
                <td><EtiquetaEstado estado={m.tipo} /></td>
                <td className="text-end"><CantidadMovimiento m={m} /> <span className="sub">{m.unidad}</span></td>
                <td className="d-none d-md-table-cell">{m.usuario_nombre}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!historial.cargando && historial.items.length === 0 && (
          <EstadoVacio icono="bi-clock-history" titulo="Sin movimientos">No hay movimientos con estos filtros.</EstadoVacio>
        )}
        {historial.error && <Alert variant="danger" className="m-3">{historial.error}</Alert>}
        <div className="pie-tabla">
          <span>{historial.total} movimiento(s)</span>
          {historial.cargando && <Spinner animation="border" size="sm" />}
          {historial.hayMas && !historial.cargando && <Button variant="link" size="sm" onClick={historial.mostrarMas}>Mostrar más</Button>}
        </div>
      </Card>
    </>
  )
}
