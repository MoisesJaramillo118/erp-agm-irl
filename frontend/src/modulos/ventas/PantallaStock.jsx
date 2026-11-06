import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Placeholder, Spinner, Table } from 'react-bootstrap'
import { api } from '../../api/cliente'
import CampoBusqueda from '../../componentes/CampoBusqueda'
import EncabezadoPagina from '../../componentes/EncabezadoPagina'
import EstadoVacio from '../../componentes/EstadoVacio'
import EtiquetaEstado, { estadoStock } from '../../componentes/EtiquetaEstado'
import useDebounce from '../../hooks/useDebounce'
import useListaPaginada from '../../hooks/useListaPaginada'
import { formatoMoneda } from '../../utils/formato'

const FILTROS = [
  ['', 'Todos'],
  ['bajo_minimo', 'Bajo mínimo'],
  ['sin_stock', 'Sin stock'],
]

const COLOR_NIVEL = { con_stock: '#16a34a', bajo_minimo: '#d97706', sin_stock: '#dc2626' }

// Barra corta: qué tan lejos está el disponible del doble del stock mínimo.
function NivelStock({ producto }) {
  const referencia = Math.max(producto.stock_minimo * 2, 1)
  const ancho = Math.max(0, Math.min(100, (producto.stock_disponible / referencia) * 100))
  return (
    <div className="nivel-stock" aria-hidden="true">
      <span style={{ width: `${ancho}%`, background: COLOR_NIVEL[estadoStock(producto)] }} />
    </div>
  )
}

// Total de productos de cada filtro (para los chips), respetando la búsqueda.
function useConteos(q, version) {
  const [conteos, setConteos] = useState({})
  useEffect(() => {
    let vigente = true
    Promise.all(FILTROS.map(([estado]) => {
      const p = new URLSearchParams({ por_pagina: 1, ...(q ? { q } : {}), ...(estado ? { estado } : {}) })
      return api(`/inventario/productos/?${p}`).then((d) => [estado, d.count]).catch(() => [estado, null])
    })).then((pares) => vigente && setConteos(Object.fromEntries(pares)))
    return () => {
      vigente = false
    }
  }, [q, version])
  return conteos
}

// HU03: el vendedor consulta el stock disponible. Los números vienen de inventario.
// Disponible = stock en almacén − lo reservado por pedidos que aún no se preparan.
export default function PantallaStock() {
  const [parametros, setParametros] = useSearchParams()
  const estado = parametros.get('estado') || ''
  const [texto, setTexto] = useState('')
  const [version, setVersion] = useState(0)
  const q = useDebounce(texto.trim())
  const { items, total, cargando, error, hayMas, mostrarMas, recargar } = useListaPaginada('/inventario/productos/', { q, estado })
  const conteos = useConteos(q, version)

  const elegirFiltro = (valor) => setParametros(valor ? { estado: valor } : {}, { replace: true })
  const actualizar = () => {
    recargar()
    setVersion((v) => v + 1)
  }

  return (
    <>
      <EncabezadoPagina icono="bi-boxes" titulo="Stock disponible"
        descripcion="«Disponible» es lo que puedes ofrecer: el stock del almacén menos lo reservado por pedidos que aún no se preparan.">
        <Button variant="light" className="border" onClick={actualizar}><i className="bi bi-arrow-clockwise" /> Actualizar</Button>
      </EncabezadoPagina>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="tarjeta-tabla">
        <Card.Header className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div className="chips" role="group" aria-label="Filtrar por estado">
            {FILTROS.map(([valor, nombre]) => (
              <button type="button" key={nombre} className={`chip ${estado === valor ? 'activo' : ''}`} onClick={() => elegirFiltro(valor)}>
                {valor && <span className="punto-chip" style={{ background: COLOR_NIVEL[valor] }} aria-hidden="true" />}{nombre}
                <span className="cuenta">{conteos[valor] ?? '…'}</span>
              </button>
            ))}
          </div>
          <CampoBusqueda valor={texto} onCambiar={setTexto} placeholder="Buscar por código o descripción…" etiqueta="Buscar producto" className="flex-grow-1" />
        </Card.Header>
        <Table responsive hover className="tabla-agm">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-end d-none d-sm-table-cell">Precio</th>
              <th className="text-end">Disponible</th>
              <th className="text-end d-none d-lg-table-cell" title="Unidades en pedidos que esperan en el almacén">Reservado</th>
              <th className="text-end d-none d-lg-table-cell">En almacén</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && items.length === 0 && [1, 2, 3, 4, 5].map((i) => (
              <tr key={i}><td colSpan={6}><Placeholder animation="glow"><Placeholder xs={12} /></Placeholder></td></tr>
            ))}
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="fw-semibold">{p.descripcion}{p.es_demo && <EtiquetaEstado estado="demo" />}</div>
                  <div className="sub">{p.codigo} · {p.categoria} · <span className="d-sm-none">{formatoMoneda(p.precio)}</span><span className="d-none d-sm-inline">{p.unidad}</span></div>
                </td>
                <td className="text-end text-nowrap tabular d-none d-sm-table-cell">{formatoMoneda(p.precio)}</td>
                <td className="text-end">
                  <div className="fw-bold fs-6 tabular">{p.stock_disponible}</div>
                  <NivelStock producto={p} />
                </td>
                <td className="text-end tabular d-none d-lg-table-cell">{p.stock_reservado || <span className="text-secondary">0</span>}</td>
                <td className="text-end tabular d-none d-lg-table-cell">
                  {p.stock_actual}
                  <div className="sub">mín. {p.stock_minimo}</div>
                </td>
                <td><EtiquetaEstado estado={estadoStock(p)} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!cargando && items.length === 0 && (
          <EstadoVacio icono={estado ? 'bi-check2-circle' : 'bi-search'} tono={estado ? 'verde' : 'gris'}
            titulo={estado ? 'Ningún producto en este estado' : 'No se encontraron productos'}>
            {estado ? 'Buena noticia: no hay productos con este nivel de stock.' : 'Prueba con otro código o descripción.'}
          </EstadoVacio>
        )}
        <div className="pie-tabla">
          <span>{total} producto(s)</span>
          {cargando && <Spinner animation="border" size="sm" />}
          {hayMas && !cargando && <Button variant="link" size="sm" onClick={mostrarMas}>Mostrar más</Button>}
        </div>
      </Card>
    </>
  )
}
