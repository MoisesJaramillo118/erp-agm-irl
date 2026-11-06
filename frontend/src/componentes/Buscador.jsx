import { useEffect, useState } from 'react'
import { ListGroup, Spinner } from 'react-bootstrap'
import { api } from '../api/cliente'
import useDebounce from '../hooks/useDebounce'

// Búsqueda con resultados desplegables. ``ruta`` recibe ?q= y responde una lista paginada.
// Con Enter se elige el resultado si es el único.
export default function Buscador({ id, ruta, placeholder, renderizar, onElegir, pie, autoFocus }) {
  const [texto, setTexto] = useState('')
  const q = useDebounce(texto.trim(), 250)
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
    api(`${ruta}?q=${encodeURIComponent(q)}&por_pagina=8`)
      .then((d) => vigente && setResultados(d.results))
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
    <div
      className="buscador"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          if (resultados.length === 1) elegir(resultados[0])
        }
        if (e.key === 'Escape') setTexto('')
      }}
    >
      <div className="campo-busqueda">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          id={id} type="search" className="form-control" placeholder={placeholder} value={texto}
          onChange={(e) => setTexto(e.target.value)} autoComplete="off" autoFocus={autoFocus}
        />
      </div>
      {q && (
        <ListGroup className="buscador-resultados">
          {cargando && <ListGroup.Item className="text-secondary"><Spinner size="sm" animation="border" className="me-2" />Buscando…</ListGroup.Item>}
          {!cargando && error && <ListGroup.Item className="text-danger">{error}</ListGroup.Item>}
          {!cargando && !error && resultados.length === 0 && (
            <ListGroup.Item className="text-secondary">
              Sin resultados para «{q}».{pie && <div className="mt-1">{pie}</div>}
            </ListGroup.Item>
          )}
          {!cargando && resultados.map((r) => (
            <ListGroup.Item key={r.id} action onClick={() => elegir(r)}>{renderizar(r)}</ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  )
}
