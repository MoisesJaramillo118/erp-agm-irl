import PantallaPendiente from '../../componentes/PantallaPendiente'

// Módulo de distribución (Sprint 3: HU09 a HU11).
export default {
  titulo: 'Distribución',
  rutas: [
    {
      ruta: '/distribucion/entregas', etiqueta: 'Entregas programadas', roles: ['repartidor'],
      elemento: <PantallaPendiente titulo="Entregas programadas" sprint={3} historias="HU10 y HU11" />,
    },
  ],
}
