// Encabezado común de cada pantalla: ícono, título, explicación breve y acciones.
export default function EncabezadoPagina({ icono, titulo, descripcion, children }) {
  return (
    <div className="encabezado-pagina">
      <div className="d-flex align-items-start gap-3 min-w-0">
        {icono && (
          <div className="icono-pagina" aria-hidden="true">
            <i className={`bi ${icono}`} />
          </div>
        )}
        <div className="min-w-0">
          <h1>{titulo}</h1>
          {descripcion && <p>{descripcion}</p>}
        </div>
      </div>
      {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
