import PantallaConteo from './PantallaConteo'
import PantallaIngresos from './PantallaIngresos'
import PantallaPedidosAlmacen from './PantallaPedidosAlmacen'

// Módulo de inventario (Sprint 2: HU05 a HU08).
export default {
  titulo: 'Inventario',
  rutas: [
    {
      ruta: '/inventario/pedidos', etiqueta: 'Pedidos por preparar', icono: 'bi-clipboard-check', tono: 'ambar',
      roles: ['almacenero'], desc: 'Prepara los pedidos en orden de llegada y confirma su conformidad.',
      elemento: <PantallaPedidosAlmacen />,
    },
    {
      ruta: '/inventario/ingresos', etiqueta: 'Ingreso de mercadería', icono: 'bi-box-arrow-in-down', tono: 'verde',
      roles: ['almacenero'], desc: 'Registra la mercadería que llega para mantener el stock al día.',
      elemento: <PantallaIngresos />,
    },
    {
      ruta: '/inventario/conteo', etiqueta: 'Conteo físico', icono: 'bi-list-check', tono: 'cian',
      roles: ['almacenero'], desc: 'Compara el stock real con el del sistema y mide la exactitud.',
      elemento: <PantallaConteo />,
    },
  ],
}
