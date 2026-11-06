import { useState } from 'react'
import { Alert, Button, Card, Form, Spinner, Table } from 'react-bootstrap'
import EtiquetaEstado from '../../componentes/EtiquetaEstado'
import useDebounce from '../../hooks/useDebounce'
import useListaPaginada from '../../hooks/useListaPaginada'
import FormularioCliente from './FormularioCliente'

// HU02: el vendedor registra y busca clientes por nombre o RUC/DNI.
export default function PantallaClientes() {
  const [texto, setTexto] = useState('')
  const q = useDebounce(texto.trim())
  const { items, total, cargando, error, hayMas, mostrarMas, recargar } = useListaPaginada('/ventas/clientes/', { q })
  const [editando, setEditando] = useState(null)
  const [aviso, setAviso] = useState('')

  const alGuardar = (c, nuevo) => {
    setEditando(null)
    setAviso(`Cliente ${c.nombre} ${nuevo ? 'registrado' : 'actualizado'}.`)
    recargar()
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">Clientes</h1>
        <Button onClick={() => setEditando('nuevo')}>+ Nuevo cliente</Button>
      </div>
      {aviso && <Alert variant="success" dismissible onClose={() => setAviso('')}>{aviso}</Alert>}
      <Form.Control
        type="search" className="mb-3" placeholder="Buscar por nombre o RUC/DNI…"
        value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar cliente"
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <Card>
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr><th>Nombre</th><th>RUC / DNI</th><th>Distrito</th><th>Teléfono</th><th>Tipo</th><th /></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="fw-semibold">{c.nombre} {c.es_demo && <EtiquetaEstado estado="demo" />}</td>
                <td>{c.ruc_dni}</td>
                <td>{c.distrito}</td>
                <td>{c.telefono || '—'}</td>
                <td>{c.tipo === 'final' ? 'Final' : 'Intermedio'}</td>
                <td className="text-end">
                  <Button size="sm" variant="outline-primary" onClick={() => setEditando(c)}>Editar</Button>
                </td>
              </tr>
            ))}
            {!cargando && items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted py-4">
                {q ? 'No se encontró ningún cliente con ese nombre o RUC/DNI.' : 'Todavía no hay clientes.'}
              </td></tr>
            )}
          </tbody>
        </Table>
      </Card>
      <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
        <span>{total} cliente(s)</span>
        {cargando && <Spinner animation="border" size="sm" />}
        {hayMas && !cargando && <Button variant="link" size="sm" onClick={mostrarMas}>Mostrar más</Button>}
      </div>
      {editando && (
        <FormularioCliente cliente={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} onGuardado={alGuardar} />
      )}
    </>
  )
}
