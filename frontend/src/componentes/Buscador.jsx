import { useEffect, useState } from 'react'
import { Form, ListGroup, Spinner } from 'react-bootstrap'
import { api } from '../api/cliente'
import useDebounce from '../hooks/useDebounce'

// Campo de búsqueda con resultados desplegables. ``ruta`` recibe ?q= y responde una lista paginada.
export default function Buscador({ id, ruta, placeholder, renderizar, onElegir, deshabilitado }) {
  const [texto, setTexto] = useState('')
  const q = useDebounce(texto.trim())
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!q) {
      setResultados([])
      return undefined
    }
    let vigente = true
    setCargando(true)
    setError('')
    api(`${ruta}?q=${encodeURIComponent(q)}`)
      .then((d) => vigente && setResultados(d.results.slice(0, 8)))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [ruta, q])

  const elegir = (item) => {
    onElegir(item)
    setTexto('')
  }

  return (
    <div className="buscador">
      <Form.Control
        id={id} type="search" placeholder={placeholder} value={texto} disabled={deshabilitado}
        onChange={(e) => setTexto(e.target.value)} autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (resultados.length === 1) elegir(resultados[0])
          }
        }}
      />
      {q && (
        <ListGroup className="buscador-resultados shadow-sm">
          {cargando && <ListGroup.Item className="text-muted"><Spinner size="sm" animation="border" /> Buscando…</ListGroup.Item>}
          {!cargando && error && <ListGroup.Item className="text-danger">{error}</ListGroup.Item>}
          {!cargando && !error && resultados.length === 0 && (
            <ListGroup.Item className="text-muted">Sin resultados para «{q}».</ListGroup.Item>
          )}
          {!cargando && resultados.map((r) => (
            <ListGroup.Item key={r.id} action onClick={() => elegir(r)}>{renderizar(r)}</ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  )
}
