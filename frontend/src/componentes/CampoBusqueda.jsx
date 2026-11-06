import { Form } from 'react-bootstrap'

// Campo de búsqueda con lupa.
export default function CampoBusqueda({ valor, onCambiar, placeholder, etiqueta, className = '' }) {
  return (
    <div className={`campo-busqueda ${className}`}>
      <i className="bi bi-search" aria-hidden="true" />
      <Form.Control
        type="search" value={valor} placeholder={placeholder} aria-label={etiqueta || placeholder}
        onChange={(e) => onCambiar(e.target.value)}
      />
    </div>
  )
}
