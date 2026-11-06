// Encabezado de un paso numerado; se marca con ✓ cuando está completo.
export default function Paso({ numero, completo, children }) {
  return (
    <div className={`paso ${completo ? 'completo' : ''}`}>
      <span className="paso-numero">{completo ? <i className="bi bi-check-lg" /> : numero}</span>
      {children}
    </div>
  )
}
