import { Badge } from 'react-bootstrap'

// Etiquetas de estado de colores (como en los prototipos de la tesis).
const ESTADOS = {
  en_almacen: { texto: 'En almacén', color: 'warning', oscuro: true },
  preparado: { texto: 'Preparado', color: 'info', oscuro: true },
  entregado: { texto: 'Entregado', color: 'success' },
  programada: { texto: 'Programada', color: 'primary' },
  vencida: { texto: 'Vencida', color: 'danger' },
  a_tiempo: { texto: 'A tiempo', color: 'success' },
  tarde: { texto: 'Tarde', color: 'danger' },
  pendiente: { texto: 'Pendiente', color: 'secondary' },
  aceptada: { texto: 'Aceptada', color: 'success' },
  rechazada: { texto: 'Rechazada', color: 'danger' },
  demo: { texto: 'DEMO', color: 'dark' },
  activo: { texto: 'Activo', color: 'success' },
  inactivo: { texto: 'Inactivo', color: 'secondary' },
  // Stock disponible
  con_stock: { texto: 'Disponible', color: 'success' },
  bajo_minimo: { texto: 'Bajo mínimo', color: 'warning', oscuro: true },
  sin_stock: { texto: 'Sin stock', color: 'danger' },
}

// Estado del stock según el disponible (stock_actual − reservado) frente al mínimo.
export function estadoStock(producto) {
  if (producto.stock_disponible <= 0) return 'sin_stock'
  if (producto.stock_disponible < producto.stock_minimo) return 'bajo_minimo'
  return 'con_stock'
}

export default function EtiquetaEstado({ estado }) {
  const e = ESTADOS[estado] || { texto: estado, color: 'secondary' }
  return (
    <Badge bg={e.color} text={e.oscuro ? 'dark' : undefined} className="etiqueta-estado">
      {e.texto}
    </Badge>
  )
}
