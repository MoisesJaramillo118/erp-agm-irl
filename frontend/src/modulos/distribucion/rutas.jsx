import PantallaPendiente from '../../componentes/PantallaPendiente'

// Módulo de distribución (Sprint 3: HU09 a HU11).
export default {
  titulo: 'Distribución',
  rutas: [
    {
      ruta: '/distribucion/entregas', etiqueta: 'Entregas programadas', icono: 'bi-truck', tono: 'verde',
      roles: ['repartidor'], sprint: 3, desc: 'Pedidos listos agrupados por distrito; registra cada entrega.',
      elemento: <PantallaPendiente titulo="Entregas programadas" sprint={3} historias="HU10 y HU11" />,
    },
  ],
}
