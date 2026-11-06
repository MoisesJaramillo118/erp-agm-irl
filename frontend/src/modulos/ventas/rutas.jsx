import PantallaClientes from './PantallaClientes'
import PantallaNuevoPedido from './PantallaNuevoPedido'
import PantallaStock from './PantallaStock'

// Módulo de ventas (Sprint 1: HU02 a HU04).
export default {
  titulo: 'Ventas',
  rutas: [
    { ruta: '/ventas/pedidos/nuevo', etiqueta: 'Nuevo pedido', roles: ['vendedor'], elemento: <PantallaNuevoPedido /> },
    { ruta: '/ventas/clientes', etiqueta: 'Clientes', roles: ['vendedor'], elemento: <PantallaClientes /> },
    { ruta: '/ventas/stock', etiqueta: 'Consultar stock', roles: ['vendedor'], elemento: <PantallaStock /> },
  ],
}
