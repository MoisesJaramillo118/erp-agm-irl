import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import { useAuth } from '../contexto/AuthContext'

export default function Login() {
  const { usuario, entrar } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await entrar(username.trim(), password)
      navegar(ubicacion.state?.desde?.pathname || '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pantalla-login">
      <Card className="tarjeta-login shadow-sm">
        <div className="barra-superior text-white text-center py-3 rounded-top">
          <h1 className="h4 mb-0 fw-bold">ERP AGM IRL</h1>
          <small>Corporación AGM IRL</small>
        </div>
        <Card.Body>
          <h2 className="h5 mb-3">Iniciar sesión</h2>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <Form onSubmit={enviar}>
            <Form.Group className="mb-3" controlId="usuario">
              <Form.Label>Usuario</Form.Label>
              <Form.Control
                value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username" autoCapitalize="none" autoFocus required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="contrasena">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required
              />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={enviando}>
              {enviando ? <Spinner size="sm" animation="border" /> : 'Entrar'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}
