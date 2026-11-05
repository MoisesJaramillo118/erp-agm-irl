import { Link } from 'react-router-dom'
import { Alert } from 'react-bootstrap'

export default function NoAutorizado() {
  return (
    <Alert variant="warning">
      <Alert.Heading className="h5">Sin permiso</Alert.Heading>
      Tu rol no tiene acceso a esta pantalla. <Link to="/">Volver al inicio</Link>.
    </Alert>
  )
}
