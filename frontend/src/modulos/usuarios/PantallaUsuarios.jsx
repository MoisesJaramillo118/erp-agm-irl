import { useMemo, useState } from 'react'
import { Alert, Button, Card, Form, InputGroup, Modal, Placeholder, Spinner, Table } from 'react-bootstrap'
import { api, erroresPorCampo } from '../../api/cliente'
import Avatar from '../../componentes/Avatar'
import CampoBusqueda from '../../componentes/CampoBusqueda'
import EncabezadoPagina from '../../componentes/EncabezadoPagina'
import EstadoVacio from '../../componentes/EstadoVacio'
import EtiquetaEstado from '../../componentes/EtiquetaEstado'
import { INFO_ROLES, ROLES } from '../../config/roles'
import { useAuth } from '../../contexto/AuthContext'
import { useNotificar } from '../../contexto/Notificaciones'
import useListaPaginada from '../../hooks/useListaPaginada'

const VACIO = { username: '', first_name: '', last_name: '', rol: 'vendedor', password: '', is_active: true }

function PildoraRol({ rol }) {
  const info = INFO_ROLES[rol]
  return (
    <span className={`pildora tono-${info.tono}`}>
      <i className={`bi ${info.icono}`} aria-hidden="true" />{ROLES[rol]}
    </span>
  )
}

function FormularioUsuario({ usuario, onCerrar, onGuardado }) {
  const nuevo = !usuario
  const [datos, setDatos] = useState(usuario ? { ...usuario, password: '' } : VACIO)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [verClave, setVerClave] = useState(false)
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
      const guardado = await api(nuevo ? '/usuarios/' : `/usuarios/${usuario.id}/`, { metodo: nuevo ? 'POST' : 'PATCH', cuerpo })
      onGuardado(guardado, nuevo)
    } catch (err) {
      setErrores(erroresPorCampo(err))
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal show onHide={onCerrar} centered size="lg">
      <Form onSubmit={guardar} noValidate>
        <Modal.Header closeButton>
          <Modal.Title className="h5">{nuevo ? 'Nuevo usuario' : `Editar a ${usuario.nombre_completo}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <div className="row g-3">
            <Form.Group className="col-md-6" controlId="u-nombres">
              <Form.Label className="fw-medium">Nombres</Form.Label>
              <Form.Control value={datos.first_name} onChange={cambiar('first_name')} isInvalid={!!errores.first_name} required autoFocus={nuevo} />
              <Form.Control.Feedback type="invalid">{errores.first_name}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-6" controlId="u-apellidos">
              <Form.Label className="fw-medium">Apellidos</Form.Label>
              <Form.Control value={datos.last_name} onChange={cambiar('last_name')} />
            </Form.Group>
            {nuevo && (
              <Form.Group className="col-md-6" controlId="u-username">
                <Form.Label className="fw-medium">Usuario para iniciar sesión</Form.Label>
                <InputGroup hasValidation>
                  <InputGroup.Text>@</InputGroup.Text>
                  <Form.Control value={datos.username} onChange={cambiar('username')} autoCapitalize="none"
                    placeholder="rquispe" isInvalid={!!errores.username} required />
                  <Form.Control.Feedback type="invalid">{errores.username}</Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
            )}
            <Form.Group className={nuevo ? 'col-md-6' : 'col-12'} controlId="u-password">
              <Form.Label className="fw-medium">{nuevo ? 'Contraseña' : 'Nueva contraseña (opcional)'}</Form.Label>
              <InputGroup hasValidation>
                <Form.Control type={verClave ? 'text' : 'password'} value={datos.password} onChange={cambiar('password')}
                  autoComplete="new-password" isInvalid={!!errores.password} required={nuevo}
                  placeholder={nuevo ? 'Mínimo 8 caracteres' : 'Déjala vacía para no cambiarla'} />
                <Button variant="outline-secondary" onClick={() => setVerClave(!verClave)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <i className={`bi ${verClave ? 'bi-eye-slash' : 'bi-eye'}`} />
                </Button>
                <Form.Control.Feedback type="invalid">{errores.password}</Form.Control.Feedback>
              </InputGroup>
              {nuevo && <Form.Text muted>Que no sea solo números ni una clave común como «12345678».</Form.Text>}
            </Form.Group>
          </div>

          <div className="mt-4">
            <div className="fw-medium mb-2" id="u-rol-titulo">Rol</div>
            <div className="opciones-tarjeta" role="radiogroup" aria-labelledby="u-rol-titulo">
              {Object.entries(INFO_ROLES).map(([valor, info]) => (
                <button type="button" key={valor} role="radio" aria-checked={datos.rol === valor} data-rol={valor}
                  className={`opcion-tarjeta ${datos.rol === valor ? 'activa' : ''}`}
                  onClick={() => setDatos({ ...datos, rol: valor })}>
                  <span className={`opcion-icono tono-${info.tono}`}><i className={`bi ${info.icono}`} /></span>
                  <span>
                    <span className="opcion-titulo d-block">{ROLES[valor]}</span>
                    <span className="opcion-desc d-block">{info.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            {errores.rol && <div className="text-danger small mt-1">{errores.rol}</div>}
          </div>

          {!nuevo && (
            <Form.Check type="switch" id="u-activo" className="mt-4" checked={datos.is_active} onChange={cambiar('is_active')}
              label="Usuario activo (puede iniciar sesión)" />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-check2" /> {nuevo ? 'Crear usuario' : 'Guardar cambios'}</>}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// HU01: el gerente crea usuarios con un rol.
export default function PantallaUsuarios() {
  const { usuario: yo } = useAuth()
  const notificar = useNotificar()
  const { items, cargando, error, hayMas, mostrarMas, recargar } = useListaPaginada('/usuarios/')
  const [editando, setEditando] = useState(null) // null = cerrado, 'nuevo' o el usuario
  const [texto, setTexto] = useState('')
  const [rol, setRol] = useState('')

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase()
    return items.filter((u) => (!rol || u.rol === rol)
      && (!q || `${u.nombre_completo} ${u.username}`.toLowerCase().includes(q)))
  }, [items, texto, rol])

  const alGuardar = (u, nuevo) => {
    setEditando(null)
    notificar(nuevo ? `Usuario @${u.username} creado como ${ROLES[u.rol]}.` : `Usuario @${u.username} actualizado.`)
    recargar()
  }

  const cuenta = (r) => items.filter((u) => !r || u.rol === r).length

  return (
    <>
      <EncabezadoPagina icono="bi-person-gear" titulo="Usuarios y roles"
        descripcion="Crea las cuentas del personal y asigna su rol. Cada persona verá solo las pantallas de su rol.">
        <Button onClick={() => setEditando('nuevo')}><i className="bi bi-person-plus" /> Nuevo usuario</Button>
      </EncabezadoPagina>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="tarjeta-tabla">
        <Card.Header className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div className="chips">
            {[['', 'Todos'], ...Object.entries(ROLES)].map(([valor, nombre]) => (
              <button type="button" key={valor || 'todos'} className={`chip ${rol === valor ? 'activo' : ''}`} onClick={() => setRol(valor)}>
                {nombre} <span className="cuenta">{cuenta(valor)}</span>
              </button>
            ))}
          </div>
          <CampoBusqueda valor={texto} onCambiar={setTexto} placeholder="Buscar por nombre o usuario…" className="flex-grow-1" />
        </Card.Header>
        <Table responsive hover className="tabla-agm">
          <thead>
            <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th className="text-end">Acciones</th></tr>
          </thead>
          <tbody>
            {cargando && items.length === 0 && [1, 2, 3].map((i) => (
              <tr key={i}><td colSpan={4}><Placeholder animation="glow"><Placeholder xs={12} /></Placeholder></td></tr>
            ))}
            {visibles.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="d-flex align-items-center gap-3">
                    <Avatar nombre={u.nombre_completo} color={INFO_ROLES[u.rol].color} />
                    <div className="min-w-0">
                      <div className="fw-semibold">
                        {u.nombre_completo}{u.id === yo.id && <span className="text-secondary fw-normal"> (tú)</span>}
                        {u.es_demo && <EtiquetaEstado estado="demo" />}
                      </div>
                      <div className="sub">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td><PildoraRol rol={u.rol} /></td>
                <td><EtiquetaEstado estado={u.is_active ? 'activo' : 'inactivo'} /></td>
                <td className="text-end">
                  <Button size="sm" variant="light" onClick={() => setEditando(u)} aria-label={`Editar a ${u.nombre_completo}`}>
                    <i className="bi bi-pencil" /> <span className="d-none d-sm-inline">Editar</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!cargando && visibles.length === 0 && (
          <EstadoVacio icono="bi-person-x" titulo="No hay usuarios con ese filtro">Prueba con otro rol o con otro nombre.</EstadoVacio>
        )}
        <div className="pie-tabla">
          <span>{visibles.length} de {items.length} usuario(s)</span>
          {cargando && <Spinner animation="border" size="sm" />}
          {hayMas && !cargando && <Button variant="link" size="sm" onClick={mostrarMas}>Mostrar más</Button>}
        </div>
      </Card>

      {editando && (
        <FormularioUsuario usuario={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} onGuardado={alGuardar} />
      )}
    </>
  )
}
