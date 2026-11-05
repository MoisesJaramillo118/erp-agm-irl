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
}

export default function EtiquetaEstado({ estado }) {
  const e = ESTADOS[estado] || { texto: estado, color: 'secondary' }
  return (
    <Badge bg={e.color} text={e.oscuro ? 'dark' : undefined} className="etiqueta-estado">
      {e.texto}
    </Badge>
  )
}
