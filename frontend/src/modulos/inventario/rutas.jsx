import PantallaPendiente from '../../componentes/PantallaPendiente'

// Módulo de inventario (Sprint 2: HU05 a HU08).
const pendiente = (titulo, historias) => <PantallaPendiente titulo={titulo} sprint={2} historias={historias} />

export default {
  titulo: 'Inventario',
  rutas: [
    {
      ruta: '/inventario/pedidos', etiqueta: 'Pedidos por preparar', icono: 'bi-clipboard-check', tono: 'ambar',
      roles: ['almacenero'], sprint: 2, desc: 'Prepara los pedidos en orden de llegada y confirma su conformidad.',
      elemento: pendiente('Pedidos por preparar', 'HU05 y HU06'),
    },
    {
      ruta: '/inventario/ingresos', etiqueta: 'Ingreso de mercadería', icono: 'bi-box-arrow-in-down', tono: 'verde',
      roles: ['almacenero'], sprint: 2, desc: 'Registra la mercadería que llega para mantener el stock al día.',
      elemento: pendiente('Ingreso de mercadería', 'HU07'),
    },
    {
      ruta: '/inventario/conteo', etiqueta: 'Conteo físico', icono: 'bi-list-check', tono: 'cian',
      roles: ['almacenero'], sprint: 2, desc: 'Compara el stock real con el del sistema y mide la exactitud.',
      elemento: pendiente('Conteo físico', 'HU08'),
    },
  ],
}
