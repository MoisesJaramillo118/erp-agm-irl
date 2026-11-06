import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { api, erroresPorCampo } from '../../api/cliente'
import { useNotificar } from '../../contexto/Notificaciones'
import { DISTRITOS } from '../../utils/distritos'

const VACIO = { nombre: '', ruc_dni: '', telefono: '', direccion: '', distrito: '', tipo: 'intermedio' }

const TIPOS = [
  ['intermedio', 'Intermedio', 'Bodega, minimarket o distribuidora', 'bi-shop', 'azul'],
  ['final', 'Final', 'Persona o negocio que consume', 'bi-person', 'violeta'],
]

function tipoDocumento(valor) {
  if (/^\d{11}$/.test(valor)) return { texto: 'RUC válido', ok: true }
  if (/^\d{8}$/.test(valor)) return { texto: 'DNI válido', ok: true }
  if (!valor) return { texto: 'DNI (8 dígitos) o RUC (11 dígitos)', ok: null }
  return { texto: `${valor.length} dígito(s): un DNI tiene 8 y un RUC 11`, ok: false }
}

// Alta o edición de un cliente (HU02). Se usa en la pantalla de clientes y al registrar un pedido.
export default function FormularioCliente({ cliente, onCerrar, onGuardado }) {
  const nuevo = !cliente
  const notificar = useNotificar()
  const [datos, setDatos] = useState(cliente || VACIO)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value })
  const doc = tipoDocumento(datos.ruc_dni.trim())

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErrores({})
    setError('')
    const { nombre, ruc_dni, telefono, direccion, distrito, tipo } = datos
    try {
      const guardado = await api(nuevo ? '/ventas/clientes/' : `/ventas/clientes/${cliente.id}/`, {
        metodo: nuevo ? 'POST' : 'PATCH',
        cuerpo: { nombre, ruc_dni: ruc_dni.trim(), telefono, direccion, distrito, tipo },
      })
      notificar(`Cliente ${guardado.nombre} ${nuevo ? 'registrado' : 'actualizado'}.`)
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
          <Modal.Title className="h5">{nuevo ? 'Nuevo cliente' : 'Editar cliente'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <div className="row g-3">
            <Form.Group className="col-md-7" controlId="cli-nombre">
              <Form.Label className="fw-medium">Nombre o razón social</Form.Label>
              <Form.Control value={datos.nombre} onChange={cambiar('nombre')} isInvalid={!!errores.nombre} required autoFocus />
              <Form.Control.Feedback type="invalid">{errores.nombre}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-5" controlId="cli-ruc_dni">
              <Form.Label className="fw-medium">RUC o DNI</Form.Label>
              <Form.Control value={datos.ruc_dni} onChange={cambiar('ruc_dni')} inputMode="numeric" maxLength={11}
                isInvalid={!!errores.ruc_dni || doc.ok === false} isValid={doc.ok === true && !errores.ruc_dni} required />
              {errores.ruc_dni
                ? <Form.Control.Feedback type="invalid">{errores.ruc_dni}</Form.Control.Feedback>
                : <Form.Text className={doc.ok === false ? 'text-danger' : 'text-secondary'}>{doc.texto}</Form.Text>}
            </Form.Group>
            <Form.Group className="col-md-5" controlId="cli-distrito">
              <Form.Label className="fw-medium">Distrito</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text><i className="bi bi-geo-alt" aria-hidden="true" /></InputGroup.Text>
                <Form.Control value={datos.distrito} onChange={cambiar('distrito')} list="lista-distritos"
                  placeholder="Escribe y elige…" isInvalid={!!errores.distrito} required />
                <Form.Control.Feedback type="invalid">{errores.distrito}</Form.Control.Feedback>
              </InputGroup>
              <datalist id="lista-distritos">
                {DISTRITOS.map((d) => <option key={d} value={d} />)}
              </datalist>
            </Form.Group>
            <Form.Group className="col-md-7" controlId="cli-direccion">
              <Form.Label className="fw-medium">Dirección <span className="text-secondary fw-normal">(opcional)</span></Form.Label>
              <Form.Control value={datos.direccion} onChange={cambiar('direccion')} placeholder="Av. / Jr. / Calle y número" />
            </Form.Group>
            <Form.Group className="col-md-5" controlId="cli-telefono">
              <Form.Label className="fw-medium">Teléfono <span className="text-secondary fw-normal">(opcional)</span></Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="bi bi-telephone" aria-hidden="true" /></InputGroup.Text>
                <Form.Control value={datos.telefono} onChange={cambiar('telefono')} inputMode="tel" />
              </InputGroup>
            </Form.Group>
            <div className="col-md-7">
              <div className="fw-medium mb-2" id="cli-tipo-titulo">Tipo de cliente</div>
              <div className="opciones-tarjeta" role="radiogroup" aria-labelledby="cli-tipo-titulo">
                {TIPOS.map(([valor, titulo, desc, icono, tono]) => (
                  <button type="button" key={valor} role="radio" aria-checked={datos.tipo === valor}
                    className={`opcion-tarjeta ${datos.tipo === valor ? 'activa' : ''}`}
                    onClick={() => setDatos({ ...datos, tipo: valor })}>
                    <span className={`opcion-icono tono-${tono}`}><i className={`bi ${icono}`} /></span>
                    <span>
                      <span className="opcion-titulo d-block">{titulo}</span>
                      <span className="opcion-desc d-block">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-check2" /> Guardar cliente</>}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
