import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from 'react-bootstrap'
import { useAuth } from '../contexto/AuthContext'
import { puedeVer } from '../config/roles'

// Exige sesión iniciada y, si se indican roles, que el rol del usuario esté entre ellos
// (el gerente siempre pasa). El servidor vuelve a validar el rol en cada endpoint.
export default function RutaProtegida({ roles, children }) {
  const { usuario, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" role="status" />
      </div>
    )
  }
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion }} />
  if (roles && !puedeVer(usuario.rol, roles)) return <Navigate to="/no-autorizado" replace />
  return children
}
