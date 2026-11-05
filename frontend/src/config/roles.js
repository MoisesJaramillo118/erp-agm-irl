export const ROLES = {
  vendedor: 'Vendedor',
  almacenero: 'Almacenero',
  repartidor: 'Repartidor',
  gerente: 'Gerente',
}

// El gerente puede ver todo; los demás roles solo lo que su lista incluye.
export function puedeVer(rol, rolesPermitidos = []) {
  return rol === 'gerente' || rolesPermitidos.includes(rol)
}
