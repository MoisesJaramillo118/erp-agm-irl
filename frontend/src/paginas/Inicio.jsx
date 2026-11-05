import { Link } from 'react-router-dom'
import { Card } from 'react-bootstrap'
import { useAuth } from '../contexto/AuthContext'
import { menuPara } from '../config/menu'
import { ROLES } from '../config/roles'

export default function Inicio() {
  const { usuario } = useAuth()
  const secciones = menuPara(usuario.rol)
  return (
    <>
      <h1 className="h4">Bienvenido, {usuario.first_name || usuario.username}</h1>
      <p className="text-muted">Tu rol: <strong>{ROLES[usuario.rol]}</strong>. Estas son tus pantallas:</p>
      {secciones.map((s) => (
        <div key={s.titulo} className="mb-3">
          <h2 className="h6 text-uppercase text-muted">{s.titulo}</h2>
          <div className="d-flex flex-wrap gap-2">
            {s.rutas.map((r) => (
              <Card key={r.ruta} as={Link} to={r.ruta} body className="atajo text-decoration-none">
                {r.etiqueta}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
