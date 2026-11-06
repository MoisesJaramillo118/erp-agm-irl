import { useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { api, erroresPorCampo } from '../../api/cliente'

const VACIO = { nombre: '', ruc_dni: '', telefono: '', direccion: '', distrito: '', tipo: 'intermedio' }

// Alta o edición de un cliente (HU02). Se usa en la pantalla de clientes y al registrar un pedido.
export default function FormularioCliente({ cliente, onCerrar, onGuardado }) {
  const nuevo = !cliente
  const [datos, setDatos] = useState(cliente || VACIO)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value })

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
      onGuardado(guardado, nuevo)
    } catch (err) {
      setErrores(erroresPorCampo(err))
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const campo = (nombre, etiqueta, props = {}) => (
    <Form.Group className={`mb-3 ${props.className || ''}`} controlId={`cli-${nombre}`}>
      <Form.Label>{etiqueta}</Form.Label>
      <Form.Control value={datos[nombre]} onChange={cambiar(nombre)} isInvalid={!!errores[nombre]} {...props} />
      <Form.Control.Feedback type="invalid">{errores[nombre]}</Form.Control.Feedback>
    </Form.Group>
  )

  return (
    <Modal show onHide={onCerrar} centered>
      <Form onSubmit={guardar} noValidate>
        <Modal.Header closeButton>
          <Modal.Title className="h5">{nuevo ? 'Nuevo cliente' : 'Editar cliente'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          {campo('nombre', 'Nombre o razón social', { required: true, autoFocus: true })}
          <div className="row g-2">
            {campo('ruc_dni', 'RUC o DNI', { className: 'col-sm-6', inputMode: 'numeric', maxLength: 11, required: true })}
            {campo('telefono', 'Teléfono', { className: 'col-sm-6', inputMode: 'tel' })}
          </div>
          {campo('direccion', 'Dirección')}
          <div className="row g-2">
            {campo('distrito', 'Distrito', { className: 'col-sm-7', required: true })}
            <Form.Group className="col-sm-5 mb-3" controlId="cli-tipo">
              <Form.Label>Tipo de cliente</Form.Label>
              <Form.Select value={datos.tipo} onChange={cambiar('tipo')}>
                <option value="intermedio">Intermedio</option>
                <option value="final">Final</option>
              </Form.Select>
            </Form.Group>
          </div>
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
