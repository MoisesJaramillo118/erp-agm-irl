import { useState } from 'react'
import { Alert, Button, Card, Form, Spinner, Table } from 'react-bootstrap'
import EtiquetaEstado, { estadoStock } from '../../componentes/EtiquetaEstado'
import useDebounce from '../../hooks/useDebounce'
import useListaPaginada from '../../hooks/useListaPaginada'
import { formatoMoneda } from '../../utils/formato'

// HU03: el vendedor consulta el stock disponible. Los números vienen de inventario.
// Disponible = stock en almacén − lo reservado por pedidos que aún no se preparan.
export default function PantallaStock() {
  const [texto, setTexto] = useState('')
  const q = useDebounce(texto.trim())
  const { items, total, cargando, error, hayMas, mostrarMas, recargar } = useListaPaginada('/inventario/productos/', { q })

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">Stock disponible</h1>
        <Button variant="outline-primary" size="sm" onClick={recargar}>Actualizar</Button>
      </div>
      <Form.Control
        type="search" className="mb-3" placeholder="Buscar por código o descripción…"
        value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar producto"
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <Card>
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th className="d-none d-sm-table-cell">Código</th><th>Descripción</th><th className="d-none d-md-table-cell">Categoría</th>
              <th className="text-end">Precio</th>
              <th className="text-end">Disponible</th>
              <th className="text-end d-none d-md-table-cell" title="Unidades en pedidos que esperan en el almacén">Reservado</th>
              <th className="text-end d-none d-md-table-cell">En almacén</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td className="text-nowrap d-none d-sm-table-cell">{p.codigo}</td>
                <td>
                  {p.descripcion} {p.es_demo && <EtiquetaEstado estado="demo" />}
                  <div className="small text-muted d-sm-none">{p.codigo}</div>
                </td>
                <td className="d-none d-md-table-cell">{p.categoria}</td>
                <td className="text-end text-nowrap">{formatoMoneda(p.precio)}</td>
                <td className="text-end fw-bold">{p.stock_disponible}</td>
                <td className="text-end d-none d-md-table-cell">{p.stock_reservado}</td>
                <td className="text-end d-none d-md-table-cell">{p.stock_actual}</td>
                <td><EtiquetaEstado estado={estadoStock(p)} /></td>
              </tr>
            ))}
            {!cargando && items.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted py-4">No se encontraron productos.</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
      <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
        <span>{total} producto(s) · «Disponible» descuenta lo reservado por pedidos en almacén.</span>
        {cargando && <Spinner animation="border" size="sm" />}
        {hayMas && !cargando && <Button variant="link" size="sm" onClick={mostrarMas}>Mostrar más</Button>}
      </div>
    </>
  )
}
