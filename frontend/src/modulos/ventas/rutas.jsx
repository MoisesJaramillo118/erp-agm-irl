import PantallaPendiente from '../../componentes/PantallaPendiente'

// Módulo de ventas (Sprint 1: HU01 a HU04).
export default {
  titulo: 'Ventas',
  rutas: [
    {
      ruta: '/ventas/pedidos/nuevo', etiqueta: 'Nuevo pedido', roles: ['vendedor'],
      elemento: <PantallaPendiente titulo="Registro de pedido" sprint={1} historias="HU04 y HU09" />,
    },
    {
      ruta: '/ventas/clientes', etiqueta: 'Clientes', roles: ['vendedor'],
      elemento: <PantallaPendiente titulo="Clientes" sprint={1} historias="HU02" />,
    },
    {
      ruta: '/ventas/stock', etiqueta: 'Consultar stock', roles: ['vendedor'],
      elemento: <PantallaPendiente titulo="Stock disponible" sprint={1} historias="HU03" />,
    },
  ],
}
