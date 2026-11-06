import PantallaUsuarios from './PantallaUsuarios'

// Administración de usuarios y roles (HU01, Sprint 1). Solo para el gerente.
export default {
  titulo: 'Administración',
  rutas: [
    { ruta: '/usuarios', etiqueta: 'Usuarios y roles', roles: [], elemento: <PantallaUsuarios /> },
  ],
}
