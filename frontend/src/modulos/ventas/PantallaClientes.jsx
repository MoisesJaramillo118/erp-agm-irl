import { useState } from 'react'
import { Alert, Button, Card, Placeholder, Spinner, Table } from 'react-bootstrap'
import Avatar from '../../componentes/Avatar'
import CampoBusqueda from '../../componentes/CampoBusqueda'
import EncabezadoPagina from '../../componentes/EncabezadoPagina'
import EstadoVacio from '../../componentes/EstadoVacio'
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

  const nuevoCliente = <Button onClick={() => setEditando('nuevo')}><i className="bi bi-person-plus" /> Nuevo cliente</Button>

  return (
    <>
      <EncabezadoPagina icono="bi-people" titulo="Clientes"
        descripcion="Busca por nombre o RUC/DNI. Los datos se reutilizan en cada pedido, sin volver a escribirlos.">
        {nuevoCliente}
      </EncabezadoPagina>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="tarjeta-tabla">
        <Card.Header>
          <CampoBusqueda valor={texto} onCambiar={setTexto} placeholder="Buscar por nombre o RUC/DNI…" etiqueta="Buscar cliente" />
        </Card.Header>
        <Table responsive hover className="tabla-agm">
          <thead>
            <tr>
              <th>Cliente</th><th>Distrito</th><th className="d-none d-md-table-cell">Teléfono</th>
              <th className="d-none d-sm-table-cell">Tipo</th><th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && items.length === 0 && [1, 2, 3, 4].map((i) => (
              <tr key={i}><td colSpan={5}><Placeholder animation="glow"><Placeholder xs={12} /></Placeholder></td></tr>
            ))}
            {items.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="d-flex align-items-center gap-3">
                    <Avatar nombre={c.nombre} />
                    <div className="min-w-0">
                      <div className="fw-semibold">{c.nombre}{c.es_demo && <EtiquetaEstado estado="demo" />}</div>
                      <div className="sub tabular">{c.ruc_dni.length === 11 ? 'RUC' : 'DNI'} {c.ruc_dni}</div>
                    </div>
                  </div>
                </td>
                <td className="text-nowrap"><i className="bi bi-geo-alt text-secondary me-1" aria-hidden="true" />{c.distrito}</td>
                <td className="d-none d-md-table-cell text-nowrap">{c.telefono || <span className="text-secondary">—</span>}</td>
                <td className="d-none d-sm-table-cell"><EtiquetaEstado estado={c.tipo} /></td>
                <td className="text-end">
                  <Button size="sm" variant="light" onClick={() => setEditando(c)} aria-label={`Editar ${c.nombre}`}>
                    <i className="bi bi-pencil" /> <span className="d-none d-sm-inline">Editar</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!cargando && items.length === 0 && (
          q ? (
            <EstadoVacio icono="bi-search" titulo="Sin resultados" accion={nuevoCliente}>
              No hay clientes con «{q}». Revisa lo escrito o regístralo como cliente nuevo.
            </EstadoVacio>
          ) : (
            <EstadoVacio icono="bi-people" tono="violeta" titulo="Todavía no hay clientes" accion={nuevoCliente}>
              Registra al primer cliente para usarlo en tus pedidos.
            </EstadoVacio>
          )
        )}
        <div className="pie-tabla">
          <span>{total} cliente(s){q ? ` con «${q}»` : ''}</span>
          {cargando && <Spinner animation="border" size="sm" />}
          {hayMas && !cargando && <Button variant="link" size="sm" onClick={mostrarMas}>Mostrar más</Button>}
        </div>
      </Card>

      {editando && (
        <FormularioCliente cliente={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); recargar() }} />
      )}
    </>
  )
}
