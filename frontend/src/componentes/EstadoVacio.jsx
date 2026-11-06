// Mensaje amable cuando no hay datos que mostrar.
export default function EstadoVacio({ icono = 'bi-inbox', tono = 'gris', titulo, children, accion }) {
  return (
    <div className="estado-vacio">
      <div className={`estado-vacio-icono tono-${tono}`} aria-hidden="true">
        <i className={`bi ${icono}`} />
      </div>
      <h2>{titulo}</h2>
      {children && <p>{children}</p>}
      {accion && <div className="mt-3">{accion}</div>}
    </div>
  )
}
