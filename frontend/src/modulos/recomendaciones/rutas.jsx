import PantallaPendiente from '../../componentes/PantallaPendiente'

// Módulo de recomendaciones explicadas (Sprint 4: HU12 a HU15). Solo para la gerencia.
export default {
  titulo: 'Recomendaciones',
  rutas: [
    {
      ruta: '/recomendaciones', etiqueta: 'Recomendaciones de reposición', roles: [],
      elemento: <PantallaPendiente titulo="Recomendaciones de reposición" sprint={4} historias="HU12, HU13 y HU14" />,
    },
    {
      ruta: '/recomendaciones/reporte', etiqueta: 'Reporte de ventas y stock', roles: [],
      elemento: <PantallaPendiente titulo="Reporte de ventas y stock" sprint={4} historias="HU15" />,
    },
    {
      ruta: '/recomendaciones/posprueba', etiqueta: 'Datos para la posprueba', roles: [],
      elemento: <PantallaPendiente titulo="Datos para la posprueba" sprint={4} historias="Utilidad para la investigación" />,
    },
  ],
}
