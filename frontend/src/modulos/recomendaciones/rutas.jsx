import PantallaPendiente from '../../componentes/PantallaPendiente'

// Módulo de recomendaciones explicadas (Sprint 4: HU12 a HU15). Solo para la gerencia.
export default {
  titulo: 'Recomendaciones',
  rutas: [
    {
      ruta: '/recomendaciones', etiqueta: 'Recomendaciones de reposición', icono: 'bi-lightbulb', tono: 'ambar',
      roles: [], sprint: 4, desc: 'Qué reponer, cuánto y por qué, con el pronóstico de la semana.',
      elemento: <PantallaPendiente titulo="Recomendaciones de reposición" sprint={4} historias="HU12, HU13 y HU14" />,
    },
    {
      ruta: '/recomendaciones/reporte', etiqueta: 'Reporte de ventas y stock', icono: 'bi-file-earmark-bar-graph', tono: 'azul',
      roles: [], sprint: 4, desc: 'Ventas y stock en un solo paso, descargable en Excel.',
      elemento: <PantallaPendiente titulo="Reporte de ventas y stock" sprint={4} historias="HU15" />,
    },
    {
      ruta: '/recomendaciones/posprueba', etiqueta: 'Datos para la posprueba', icono: 'bi-clipboard-data', tono: 'gris',
      roles: [], sprint: 4, desc: 'Exporta los indicadores que llenan las fichas de la posprueba.',
      elemento: <PantallaPendiente titulo="Datos para la posprueba" sprint={4} historias="Utilidad para la investigación" />,
    },
  ],
}
