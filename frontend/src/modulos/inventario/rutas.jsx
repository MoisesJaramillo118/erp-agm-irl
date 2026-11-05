import PantallaPendiente from '../../componentes/PantallaPendiente'

// Módulo de inventario (Sprint 2: HU05 a HU08).
export default {
  titulo: 'Inventario',
  rutas: [
    {
      ruta: '/inventario/pedidos', etiqueta: 'Pedidos por preparar', roles: ['almacenero'],
      elemento: <PantallaPendiente titulo="Pedidos por preparar" sprint={2} historias="HU05 y HU06" />,
    },
    {
      ruta: '/inventario/ingresos', etiqueta: 'Ingreso de mercadería', roles: ['almacenero'],
      elemento: <PantallaPendiente titulo="Ingreso de mercadería" sprint={2} historias="HU07" />,
    },
    {
      ruta: '/inventario/conteo', etiqueta: 'Conteo físico', roles: ['almacenero'],
      elemento: <PantallaPendiente titulo="Conteo físico" sprint={2} historias="HU08" />,
    },
  ],
}
