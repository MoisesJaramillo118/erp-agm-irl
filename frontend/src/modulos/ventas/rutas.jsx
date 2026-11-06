import PantallaClientes from './PantallaClientes'
import PantallaNuevoPedido from './PantallaNuevoPedido'
import PantallaStock from './PantallaStock'

// Módulo de ventas (Sprint 1: HU02 a HU04).
export default {
  titulo: 'Ventas',
  rutas: [
    {
      ruta: '/ventas/pedidos/nuevo', etiqueta: 'Nuevo pedido', icono: 'bi-cart-plus', tono: 'azul', roles: ['vendedor'],
      desc: 'Registra el pedido y envíalo al almacén al instante, sin papel.', elemento: <PantallaNuevoPedido />,
    },
    {
      ruta: '/ventas/clientes', etiqueta: 'Clientes', icono: 'bi-people', tono: 'violeta', roles: ['vendedor'],
      desc: 'Busca o registra clientes por nombre o RUC/DNI.', elemento: <PantallaClientes />,
    },
    {
      ruta: '/ventas/stock', etiqueta: 'Consultar stock', icono: 'bi-boxes', tono: 'cian', roles: ['vendedor'],
      desc: 'Revisa cuánto hay disponible antes de confirmar al cliente.', elemento: <PantallaStock />,
    },
  ],
}
