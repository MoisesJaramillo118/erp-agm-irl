import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Col, Form, Placeholder, ProgressBar, Row, Spinner, Table } from 'react-bootstrap'
import { api } from '../../api/cliente'
import Buscador from '../../componentes/Buscador'
import EncabezadoPagina from '../../componentes/EncabezadoPagina'
import EstadoVacio from '../../componentes/EstadoVacio'
import EtiquetaEstado from '../../componentes/EtiquetaEstado'
import Paso from '../../componentes/Paso'
import { useNotificar } from '../../contexto/Notificaciones'
import useListaPaginada from '../../hooks/useListaPaginada'
import { formatoFecha } from '../../utils/formato'

// Color de la exactitud: verde desde 95 %, ámbar desde 80 %, rojo por debajo.
function colorExactitud(valor) {
  if (valor == null) return '#94a3b8'
  if (valor >= 95) return '#16a34a'
  if (valor >= 80) return '#d97706'
  return '#dc2626'
}

function porcentaje(valor) {
  if (valor == null) return '—'
  return `${Number(valor).toLocaleString('es-PE', { maximumFractionDigits: 2 })} %`
}

function Anillo({ valor }) {
  return (
    <div className="anillo-exactitud" style={{ '--valor': valor ?? 0, '--color': colorExactitud(valor) }}
      role="img" aria-label={`Exactitud ${porcentaje(valor)}`}>
      <span className="valor">{porcentaje(valor)}</span>
    </div>
  )
}

function Diferencia({ valor }) {
  if (valor === 0) return <span className="text-secondary tabular">0</span>
  return <span className={`fw-bold tabular ${valor < 0 ? 'text-danger' : 'text-warning-emphasis'}`}>{valor > 0 ? `+${valor}` : `−${Math.abs(valor)}`}</span>
}

// ---------- Lista de conteos ----------
function ListaConteos({ onNuevo, onVer }) {
  const { items, total, cargando, error, hayMas, mostrarMas } = useListaPaginada('/inventario/conteos/')
  const ultimo = items[0]

  return (
    <>
      <EncabezadoPagina icono="bi-list-check" titulo="Conteo físico"
        descripcion="Compara lo que hay en el anaquel con el stock del sistema. La exactitud es el porcentaje de productos que coinciden.">
        <Button onClick={onNuevo}><i className="bi bi-plus-lg" /> Nuevo conteo</Button>
      </EncabezadoPagina>

      {error && <Alert variant="danger">{error}</Alert>}

      {ultimo && (
        <Card className="mb-4">
          <Card.Body className="d-flex flex-wrap align-items-center gap-4">
            <Anillo valor={ultimo.exactitud} />
            <div className="min-w-0">
              <div className="small text-secondary text-uppercase fw-semibold" style={{ letterSpacing: '.06em' }}>Último conteo · {formatoFecha(ultimo.fecha)}</div>
              <div className="h4 fw-bold mb-1">Exactitud del inventario: {porcentaje(ultimo.exactitud)}</div>
              <div className="text-secondary">{ultimo.coinciden} de {ultimo.contados} productos coinciden con el sistema · lo registró {ultimo.usuario_nombre}.</div>
              <Button variant="link" className="px-0" onClick={() => onVer(ultimo.id)}>Ver las diferencias <i className="bi bi-arrow-right" /></Button>
            </div>
          </Card.Body>
        </Card>
      )}

      <Card className="tarjeta-tabla">
        <Card.Header className="fw-semibold">Conteos registrados</Card.Header>
        <Table responsive hover className="tabla-agm">
          <thead>
            <tr>
              <th>Fecha</th>
              <th className="text-end">Contados</th>
              <th className="text-end">Coinciden</th>
              <th>Exactitud</th>
              <th className="d-none d-md-table-cell">Registró</th>
              <th aria-label="Ver" />
            </tr>
          </thead>
          <tbody>
            {cargando && items.length === 0 && [1, 2].map((i) => (
              <tr key={i}><td colSpan={6}><Placeholder animation="glow"><Placeholder xs={12} /></Placeholder></td></tr>
            ))}
            {items.map((c) => (
              <tr key={c.id} className="fila-enlace" onClick={() => onVer(c.id)}>
                <td className="tabular fw-semibold">{formatoFecha(c.fecha)}{c.es_demo && <EtiquetaEstado estado="demo" />}</td>
                <td className="text-end tabular">{c.contados}</td>
                <td className="text-end tabular">{c.coinciden}</td>
                <td style={{ minWidth: '8rem' }}>
                  <div className="fw-bold tabular" style={{ color: colorExactitud(c.exactitud) }}>{porcentaje(c.exactitud)}</div>
                  <div className="nivel-stock" aria-hidden="true"><span style={{ width: `${c.exactitud ?? 0}%`, background: colorExactitud(c.exactitud) }} /></div>
                </td>
                <td className="d-none d-md-table-cell">{c.usuario_nombre}</td>
                <td className="text-end"><i className="bi bi-chevron-right text-secondary" aria-hidden="true" /></td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!cargando && items.length === 0 && (
          <EstadoVacio icono="bi-list-check" tono="cian" titulo="Aún no hay conteos"
            accion={<Button onClick={onNuevo}><i className="bi bi-plus-lg" /> Hacer el primer conteo</Button>}>
            Cuenta algunos productos del almacén y compáralos con el sistema.
          </EstadoVacio>
        )}
        <div className="pie-tabla">
          <span>{total} conteo(s)</span>
          {cargando && <Spinner animation="border" size="sm" />}
          {hayMas && !cargando && <Button variant="link" size="sm" onClick={mostrarMas}>Mostrar más</Button>}
        </div>
      </Card>
    </>
  )
}

// ---------- Nuevo conteo ----------
// Conteo «a ciegas»: el almacenero anota lo que cuenta sin ver el stock del sistema, para no influir en el conteo.
// El sistema guarda su propio stock al registrar y recién entonces muestra las diferencias.
function NuevoConteo({ onVolver, onRegistrado }) {
  const notificar = useNotificar()
  const [lineas, setLineas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargandoCategoria, setCargandoCategoria] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/inventario/categorias/').then(setCategorias).catch(() => setCategorias([]))
  }, [])

  const agregarProductos = (productos) => {
    const ids = new Set(lineas.map((l) => l.producto.id))
    const nuevos = productos.filter((p) => !ids.has(p.id)).map((p) => ({ producto: p, fisico: '' }))
    setLineas((previas) => [...previas, ...nuevos])
    return nuevos.length
  }

  const agregarCategoria = async (nombre) => {
    setCargandoCategoria(nombre)
    try {
      const d = await api(`/inventario/productos/?categoria=${encodeURIComponent(nombre)}&por_pagina=200`)
      const n = agregarProductos(d.results)
      notificar(n ? `Se agregaron ${n} producto(s) de ${nombre}.` : `Los productos de ${nombre} ya están en el conteo.`, 'info')
    } catch (e) {
      notificar(e.message, 'error')
    } finally {
      setCargandoCategoria('')
    }
  }

  const anotar = (id, valor) => setLineas(lineas.map((l) => (l.producto.id === id ? { ...l, fisico: valor } : l)))
  const valido = (v) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0
  const anotados = lineas.filter((l) => valido(l.fisico)).length
  const listo = lineas.length > 0 && anotados === lineas.length

  const registrar = async () => {
    if (!listo) return
    setEnviando(true)
    setError('')
    try {
      const conteo = await api('/inventario/conteos/', {
        metodo: 'POST',
        cuerpo: { detalles: lineas.map((l) => ({ producto: l.producto.id, stock_fisico: Number(l.fisico) })) },
      })
      notificar(`Conteo registrado: exactitud ${porcentaje(conteo.exactitud)}.`)
      onRegistrado(conteo.id)
    } catch (e) {
      setError(e.message)
      setEnviando(false)
    }
  }

  return (
    <>
      <EncabezadoPagina icono="bi-list-check" titulo="Nuevo conteo físico"
        descripcion="Cuenta lo que hay en el anaquel y anótalo. El stock del sistema se muestra al registrar, para que el conteo sea objetivo.">
        <Button variant="light" className="border" onClick={onVolver}><i className="bi bi-arrow-left" /> Volver</Button>
      </EncabezadoPagina>

      <Card className="mb-4">
        <Card.Header><Paso numero={1} completo={lineas.length > 0}>Productos a contar</Paso></Card.Header>
        <Card.Body>
          <Form.Label htmlFor="buscar-producto" className="fw-medium">Agrega productos uno por uno…</Form.Label>
          <Buscador id="buscar-producto" ruta="/inventario/productos/" placeholder="Busca por código o descripción…"
            onElegir={(p) => agregarProductos([p])}
            renderizar={(p) => (
              <div className="min-w-0">
                <div className="fw-semibold">{p.descripcion}</div>
                <div className="small text-secondary">{p.codigo} · {p.categoria}</div>
              </div>
            )} />
          {categorias.length > 0 && (
            <>
              <div className="fw-medium mt-3 mb-2">…o una categoría completa</div>
              <div className="chips">
                {categorias.map((c) => (
                  <button type="button" key={c} className="chip" disabled={!!cargandoCategoria} onClick={() => agregarCategoria(c)}>
                    {cargandoCategoria === c ? <Spinner size="sm" animation="border" /> : <i className="bi bi-plus" aria-hidden="true" />}{c}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      <Card className="tarjeta-tabla">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <Paso numero={2} completo={listo}>Anota lo que contaste</Paso>
          {lineas.length > 0 && (
            <div className="d-flex align-items-center gap-2 small text-secondary" style={{ minWidth: '12rem' }}>
              <span className="text-nowrap">{anotados} de {lineas.length}</span>
              <ProgressBar now={(anotados / lineas.length) * 100} variant="success" className="progreso-listos flex-grow-1" />
            </div>
          )}
        </Card.Header>
        {lineas.length === 0 ? (
          <EstadoVacio icono="bi-clipboard-data" tono="cian" titulo="Aún no hay productos en el conteo">
            Agrégalos arriba. Para medir la exactitud del inventario se cuentan 20 productos en cada medición.
          </EstadoVacio>
        ) : (
          <Table responsive className="tabla-agm mb-0">
            <thead>
              <tr><th style={{ width: '2.5rem' }}>#</th><th>Producto</th><th className="text-end" style={{ width: '9rem' }}>Contado</th><th aria-label="Quitar" /></tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={l.producto.id}>
                  <td className="text-secondary tabular">{i + 1}</td>
                  <td>
                    <div className="fw-semibold">{l.producto.descripcion}{l.producto.es_demo && <EtiquetaEstado estado="demo" />}</div>
                    <div className="sub">{l.producto.codigo} · {l.producto.unidad}</div>
                  </td>
                  <td className="text-end">
                    <Form.Control type="number" min={0} step={1} inputMode="numeric" className="text-center campo-contado ms-auto"
                      placeholder="—" aria-label={`Contado de ${l.producto.descripcion}`} value={l.fisico}
                      isInvalid={l.fisico !== '' && !valido(l.fisico)} onChange={(e) => anotar(l.producto.id, e.target.value)} />
                  </td>
                  <td className="text-end">
                    <Button size="sm" variant="link" className="text-danger px-1" aria-label={`Quitar ${l.producto.descripcion}`}
                      onClick={() => setLineas(lineas.filter((x) => x.producto.id !== l.producto.id))}><i className="bi bi-trash3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Card.Body className="border-top d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div className="small text-secondary">
            <i className="bi bi-eye-slash me-1" aria-hidden="true" />La fecha, tu usuario y el stock del sistema los pone el sistema al registrar.
          </div>
          {error && <Alert variant="danger" className="py-2 mb-0 w-100">{error}</Alert>}
          <Button size="lg" disabled={!listo || enviando} onClick={registrar}>
            {enviando ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-check2-square" /> Registrar conteo</>}
          </Button>
        </Card.Body>
      </Card>
    </>
  )
}

// ---------- Resultado de un conteo ----------
function ResultadoConteo({ id, onVolver }) {
  const [conteo, setConteo] = useState(null)
  const [error, setError] = useState('')
  const [soloDiferencias, setSoloDiferencias] = useState(false)

  useEffect(() => {
    let vigente = true
    setConteo(null)
    api(`/inventario/conteos/${id}/`).then((c) => vigente && setConteo(c)).catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [id])

  if (error) return <Alert variant="danger">{error} <Button variant="link" onClick={onVolver}>Volver</Button></Alert>
  if (!conteo) return <div className="text-center py-5"><Spinner animation="border" /></div>

  const conDiferencia = conteo.contados - conteo.coinciden
  const faltan = conteo.detalles.filter((d) => d.diferencia < 0).reduce((s, d) => s + d.diferencia, 0)
  const sobran = conteo.detalles.filter((d) => d.diferencia > 0).reduce((s, d) => s + d.diferencia, 0)
  const filas = soloDiferencias ? conteo.detalles.filter((d) => !d.coincide) : conteo.detalles

  return (
    <>
      <EncabezadoPagina icono="bi-clipboard-data" titulo={`Conteo del ${formatoFecha(conteo.fecha)}`}
        descripcion={`Registrado por ${conteo.usuario_nombre}. Diferencia = contado en el anaquel − stock del sistema.`}>
        <Button variant="light" className="border" onClick={onVolver}><i className="bi bi-arrow-left" /> Conteos</Button>
      </EncabezadoPagina>

      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body className="d-flex align-items-center gap-4">
              <Anillo valor={conteo.exactitud} />
              <div className="min-w-0">
                <div className="small text-secondary text-uppercase fw-semibold" style={{ letterSpacing: '.06em' }}>Exactitud del conteo</div>
                <div className="fs-5 fw-semibold">{conteo.coinciden} de {conteo.contados} productos coinciden</div>
                <div className="small text-secondary mt-1">Exactitud = productos que coinciden ÷ productos contados × 100</div>
                {conteo.es_demo && <EtiquetaEstado estado="demo" />}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} lg={3}>
          <Card className="h-100">
            <div className="indicador">
              <div className="indicador-icono tono-verde" aria-hidden="true"><i className="bi bi-check2-circle" /></div>
              <div><div className="indicador-valor">{conteo.coinciden}</div><div className="indicador-etiqueta">Coinciden</div></div>
            </div>
          </Card>
        </Col>
        <Col sm={6} lg={3}>
          <Card className="h-100">
            <div className="indicador">
              <div className={`indicador-icono ${conDiferencia ? 'tono-rojo' : 'tono-gris'}`} aria-hidden="true"><i className="bi bi-exclamation-triangle" /></div>
              <div>
                <div className="indicador-valor">{conDiferencia}</div>
                <div className="indicador-etiqueta">Con diferencia{conDiferencia > 0 && <><br />faltan {Math.abs(faltan)} · sobran {sobran} und.</>}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="tarjeta-tabla">
        <Card.Header className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <span className="fw-semibold">Diferencia por producto</span>
          <div className="chips" role="group" aria-label="Filtrar">
            <button type="button" className={`chip ${!soloDiferencias ? 'activo' : ''}`} onClick={() => setSoloDiferencias(false)}>
              Todos <span className="cuenta">{conteo.contados}</span>
            </button>
            <button type="button" className={`chip ${soloDiferencias ? 'activo' : ''}`} onClick={() => setSoloDiferencias(true)}>
              <span className="punto-chip" style={{ background: '#dc2626' }} aria-hidden="true" />Con diferencia <span className="cuenta">{conDiferencia}</span>
            </button>
          </div>
        </Card.Header>
        <Table responsive hover className="tabla-agm">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-end">Sistema</th>
              <th className="text-end">Contado</th>
              <th className="text-end">Diferencia</th>
              <th className="d-none d-sm-table-cell">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((d) => (
              <tr key={d.producto} className={d.coincide ? '' : 'fila-diferencia'}>
                <td>
                  <div className="fw-semibold">{d.descripcion}</div>
                  <div className="sub">{d.codigo} · {d.unidad}</div>
                </td>
                <td className="text-end tabular">{d.stock_sistema}</td>
                <td className="text-end tabular fw-semibold">{d.stock_fisico}</td>
                <td className="text-end"><Diferencia valor={d.diferencia} /></td>
                <td className="d-none d-sm-table-cell"><EtiquetaEstado estado={d.coincide ? 'coincide' : 'diferencia'} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
        {filas.length === 0 && (
          <EstadoVacio icono="bi-check2-all" tono="verde" titulo="Todo coincide">Ningún producto tiene diferencia con el sistema.</EstadoVacio>
        )}
      </Card>
    </>
  )
}

// HU08: el almacenero registra el conteo físico; el sistema muestra la diferencia de cada producto
// y la exactitud del conteo (productos que coinciden / productos contados × 100).
export default function PantallaConteo() {
  const [parametros, setParametros] = useSearchParams()
  const ver = parametros.get('ver')
  const nuevo = parametros.get('nuevo')

  const irA = (p) => {
    setParametros(p)
    window.scrollTo(0, 0)
  }

  if (nuevo) return <NuevoConteo onVolver={() => irA({})} onRegistrado={(id) => irA({ ver: id })} />
  if (ver) return <ResultadoConteo id={ver} onVolver={() => irA({})} />
  return <ListaConteos onNuevo={() => irA({ nuevo: 1 })} onVer={(id) => irA({ ver: id })} />
}
