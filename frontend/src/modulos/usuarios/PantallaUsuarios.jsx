import { useState } from 'react'
import { Alert, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap'
import { api, erroresPorCampo } from '../../api/cliente'
import EtiquetaEstado from '../../componentes/EtiquetaEstado'
import { ROLES } from '../../config/roles'
import { useAuth } from '../../contexto/AuthContext'
import useListaPaginada from '../../hooks/useListaPaginada'

const VACIO = { username: '', first_name: '', last_name: '', rol: 'vendedor', password: '', is_active: true }

function FormularioUsuario({ usuario, onCerrar, onGuardado }) {
  const nuevo = !usuario
  const [datos, setDatos] = useState(usuario ? { ...usuario, password: '' } : VACIO)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campo) => (e) =>
    setDatos({ ...datos, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErrores({})
    setError('')
    const cuerpo = { first_name: datos.first_name, last_name: datos.last_name, rol: datos.rol, is_active: datos.is_active }
    if (nuevo) cuerpo.username = datos.username.trim()
    if (datos.password) cuerpo.password = datos.password
    try {
      const guardado = await api(nuevo ? '/usuarios/' : `/usuarios/${usuario.id}/`, {
        metodo: nuevo ? 'POST' : 'PATCH', cuerpo,
      })
      onGuardado(guardado, nuevo)
    } catch (err) {
      setErrores(erroresPorCampo(err))
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal show onHide={onCerrar} centered>
      <Form onSubmit={guardar} noValidate>
        <Modal.Header closeButton>
          <Modal.Title className="h5">{nuevo ? 'Nuevo usuario' : `Editar ${usuario.username}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          {nuevo && (
            <Form.Group className="mb-3" controlId="u-username">
              <Form.Label>Usuario (para iniciar sesión)</Form.Label>
              <Form.Control value={datos.username} onChange={cambiar('username')} autoCapitalize="none"
                isInvalid={!!errores.username} required />
              <Form.Control.Feedback type="invalid">{errores.username}</Form.Control.Feedback>
            </Form.Group>
          )}
          <div className="row g-2">
            <Form.Group className="col-sm-6 mb-3" controlId="u-nombres">
              <Form.Label>Nombres</Form.Label>
              <Form.Control value={datos.first_name} onChange={cambiar('first_name')} isInvalid={!!errores.first_name} required />
              <Form.Control.Feedback type="invalid">{errores.first_name}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-sm-6 mb-3" controlId="u-apellidos">
              <Form.Label>Apellidos</Form.Label>
              <Form.Control value={datos.last_name} onChange={cambiar('last_name')} />
            </Form.Group>
          </div>
          <Form.Group className="mb-3" controlId="u-rol">
            <Form.Label>Rol</Form.Label>
            <Form.Select value={datos.rol} onChange={cambiar('rol')} isInvalid={!!errores.rol}>
              {Object.entries(ROLES).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errores.rol}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3" controlId="u-password">
            <Form.Label>{nuevo ? 'Contraseña' : 'Nueva contraseña'}</Form.Label>
            <Form.Control type="password" value={datos.password} onChange={cambiar('password')}
              autoComplete="new-password" isInvalid={!!errores.password} required={nuevo} />
            <Form.Text muted>
              {nuevo ? 'Mínimo 8 caracteres; que no sea solo números ni una clave común.' : 'Déjala vacía para no cambiarla.'}
            </Form.Text>
            <Form.Control.Feedback type="invalid">{errores.password}</Form.Control.Feedback>
          </Form.Group>
          {!nuevo && (
            <Form.Check type="switch" id="u-activo" label="Usuario activo (puede iniciar sesión)"
              checked={datos.is_active} onChange={cambiar('is_active')} />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? <Spinner size="sm" animation="border" /> : 'Guardar'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// HU01: el gerente crea usuarios con un rol.
export default function PantallaUsuarios() {
  const { usuario: yo } = useAuth()
  const { items, cargando, error, hayMas, mostrarMas, recargar } = useListaPaginada('/usuarios/')
  const [editando, setEditando] = useState(null) // null = cerrado, 'nuevo' o el usuario
  const [aviso, setAviso] = useState('')

  const alGuardar = (u, nuevo) => {
    setEditando(null)
    setAviso(nuevo ? `Usuario ${u.username} creado con rol ${ROLES[u.rol]}.` : `Usuario ${u.username} actualizado.`)
    recargar()
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">Usuarios y roles</h1>
        <Button onClick={() => setEditando('nuevo')}>+ Nuevo usuario</Button>
      </div>
      {aviso && <Alert variant="success" dismissible onClose={() => setAviso('')}>{aviso}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      <Card>
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th /></tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td className="fw-semibold">
                  {u.username} {u.es_demo && <EtiquetaEstado estado="demo" />}
                </td>
                <td>{u.nombre_completo}</td>
                <td>{ROLES[u.rol]}</td>
                <td><EtiquetaEstado estado={u.is_active ? 'activo' : 'inactivo'} /></td>
                <td className="text-end">
                  <Button size="sm" variant="outline-primary" onClick={() => setEditando(u)}>
                    {u.id === yo.id ? 'Editar (tú)' : 'Editar'}
                  </Button>
                </td>
              </tr>
            ))}
            {!cargando && items.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted py-4">No hay usuarios.</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
      {cargando && <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>}
      {hayMas && !cargando && <div className="text-center mt-2"><Button variant="link" onClick={mostrarMas}>Mostrar más</Button></div>}
      {editando && (
        <FormularioUsuario usuario={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} onGuardado={alGuardar} />
      )}
    </>
  )
}
