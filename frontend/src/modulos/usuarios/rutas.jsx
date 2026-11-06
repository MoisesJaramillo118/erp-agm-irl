import PantallaUsuarios from './PantallaUsuarios'

// Administración de usuarios y roles (HU01, Sprint 1). Solo para el gerente.
export default {
  titulo: 'Administración',
  rutas: [
    {
      ruta: '/usuarios', etiqueta: 'Usuarios y roles', icono: 'bi-person-gear', tono: 'violeta', roles: [],
      desc: 'Crea las cuentas del personal y asigna a cada uno su rol.', elemento: <PantallaUsuarios />,
    },
  ],
}
