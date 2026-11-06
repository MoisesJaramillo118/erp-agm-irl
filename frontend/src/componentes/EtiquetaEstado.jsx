// Etiquetas de estado de colores: píldoras suaves con un punto o un ícono.
const ESTADOS = {
  // Pedido
  en_almacen: { texto: 'En almacén', clase: 'alerta', icono: 'bi-hourglass-split' },
  preparado: { texto: 'Preparado', clase: 'info', icono: 'bi-box-seam' },
  entregado: { texto: 'Entregado', clase: 'exito', icono: 'bi-check2-circle' },
  // Entrega
  programada: { texto: 'Programada', clase: 'primario' },
  vencida: { texto: 'Vencida', clase: 'peligro' },
  a_tiempo: { texto: 'A tiempo', clase: 'exito' },
  tarde: { texto: 'Tarde', clase: 'peligro' },
  // Recomendación
  pendiente: { texto: 'Pendiente', clase: 'neutra' },
  aceptada: { texto: 'Aceptada', clase: 'exito' },
  rechazada: { texto: 'Rechazada', clase: 'peligro' },
  // Usuario
  activo: { texto: 'Activo', clase: 'exito' },
  inactivo: { texto: 'Inactivo', clase: 'neutra' },
  // Stock disponible
  con_stock: { texto: 'Disponible', clase: 'exito' },
  bajo_minimo: { texto: 'Bajo mínimo', clase: 'alerta' },
  sin_stock: { texto: 'Sin stock', clase: 'peligro' },
  // Cliente
  intermedio: { texto: 'Intermedio', clase: 'primario' },
  final: { texto: 'Final', clase: 'violeta' },
}

export default function EtiquetaEstado({ estado, texto }) {
  if (estado === 'demo') return <span className="etiqueta-demo" title="Dato de demostración (inventado)">DEMO</span>
  const e = ESTADOS[estado] || { texto: estado, clase: 'neutra' }
  return (
    <span className={`pildora pildora-${e.clase}`}>
      {e.icono ? <i className={`bi ${e.icono}`} aria-hidden="true" /> : <span className="punto" aria-hidden="true" />}
      {texto || e.texto}
    </span>
  )
}

// Estado del stock según el disponible (stock_actual − reservado) frente al mínimo.
export function estadoStock(producto) {
  if (producto.stock_disponible <= 0) return 'sin_stock'
  if (producto.stock_disponible < producto.stock_minimo) return 'bajo_minimo'
  return 'con_stock'
}
