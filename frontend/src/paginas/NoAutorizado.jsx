import { Link } from 'react-router-dom'
import { Card } from 'react-bootstrap'
import EstadoVacio from '../componentes/EstadoVacio'

export default function NoAutorizado() {
  return (
    <Card className="mt-2">
      <EstadoVacio
        icono="bi-shield-lock" tono="rojo" titulo="Sin permiso"
        accion={<Link to="/" className="btn btn-primary"><i className="bi bi-house" /> Volver al inicio</Link>}
      >
        Tu rol no tiene acceso a esta pantalla. Si crees que es un error, pide a la gerencia que revise tu rol.
      </EstadoVacio>
    </Card>
  )
}
