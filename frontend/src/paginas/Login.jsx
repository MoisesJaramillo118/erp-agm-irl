import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import Logo from '../componentes/Logo'
import { useAuth } from '../contexto/AuthContext'

const VENTAJAS = [
  ['bi-cart-check', 'Pedidos sin papel: llegan al almacén al instante.'],
  ['bi-box-seam', 'Stock en línea, con lo reservado por cada pedido.'],
  ['bi-truck', 'Entregas con fecha acordada y conformidad del cliente.'],
]

export default function Login() {
  const { usuario, entrar } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [verClave, setVerClave] = useState(false)
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
    <div className="login">
      <section className="login-marca d-none d-lg-flex">
        <div className="d-flex align-items-center gap-2 fw-bold fs-5">
          <Logo tamano={38} /> ERP AGM IRL
        </div>
        <div>
          <h2 className="mb-3">Ventas, almacén y reparto en un solo lugar.</h2>
          <p className="mb-4">El sistema de la Corporación AGM IRL para atender cada pedido más rápido y decidir la reposición con datos.</p>
          {VENTAJAS.map(([icono, texto]) => (
            <div key={icono} className="ventaja"><i className={`bi ${icono}`} aria-hidden="true" />{texto}</div>
          ))}
        </div>
        <div className="small" style={{ color: '#8da2c0' }}>Corporación AGM IRL · Lima, Perú</div>
      </section>

      <section className="login-formulario">
        <div className="login-caja">
          <div className="d-flex d-lg-none align-items-center gap-2 fw-bold fs-5 mb-4">
            <Logo tamano={36} /> ERP AGM IRL
          </div>
          <h1 className="h3 mb-1">Bienvenido</h1>
          <p className="text-secondary mb-4">Ingresa con el usuario y la contraseña que te dio la gerencia.</p>
          {error && (
            <Alert variant="danger" className="py-2 d-flex gap-2 align-items-start">
              <i className="bi bi-exclamation-circle mt-1" aria-hidden="true" />{error}
            </Alert>
          )}
          <Form onSubmit={enviar}>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="usuario" className="fw-medium">Usuario</Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="bi bi-person" aria-hidden="true" /></InputGroup.Text>
                <Form.Control
                  id="usuario" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu.usuario"
                  autoComplete="username" autoCapitalize="none" autoFocus required
                />
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label htmlFor="contrasena" className="fw-medium">Contraseña</Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="bi bi-lock" aria-hidden="true" /></InputGroup.Text>
                <Form.Control
                  id="contrasena" type={verClave ? 'text' : 'password'} value={password} placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required
                />
                <Button className="btn-ojo" onClick={() => setVerClave(!verClave)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <i className={`bi ${verClave ? 'bi-eye-slash' : 'bi-eye'}`} />
                </Button>
              </InputGroup>
            </Form.Group>
            <Button type="submit" size="lg" className="w-100" disabled={enviando}>
              {enviando ? <Spinner size="sm" animation="border" /> : <>Ingresar <i className="bi bi-arrow-right" /></>}
            </Button>
          </Form>
        </div>
      </section>
    </div>
  )
}
