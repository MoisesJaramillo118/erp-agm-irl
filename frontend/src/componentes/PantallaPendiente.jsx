import { Link } from 'react-router-dom'
import { Card } from 'react-bootstrap'
import EstadoVacio from './EstadoVacio'

// Pantallas que se construyen en sprints posteriores.
export default function PantallaPendiente({ titulo, sprint, historias }) {
  return (
    <Card className="mt-2">
      <EstadoVacio
        icono="bi-cone-striped" tono="ambar" titulo={`${titulo}: próximamente`}
        accion={<Link to="/" className="btn btn-outline-primary"><i className="bi bi-house" /> Volver al inicio</Link>}
      >
        Esta pantalla se construye en el Sprint {sprint} ({historias}).
      </EstadoVacio>
    </Card>
  )
}
