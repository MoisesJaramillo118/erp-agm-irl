export const ROLES = {
  vendedor: 'Vendedor',
  almacenero: 'Almacenero',
  repartidor: 'Repartidor',
  gerente: 'Gerente',
}

// Ícono, color y descripción de cada rol (para el selector de rol y los avatares).
export const INFO_ROLES = {
  vendedor: { icono: 'bi-bag-check', tono: 'azul', color: '#2563eb', desc: 'Registra clientes y pedidos; consulta el stock.' },
  almacenero: { icono: 'bi-box-seam', tono: 'ambar', color: '#d97706', desc: 'Prepara pedidos, ingresos y conteos físicos.' },
  repartidor: { icono: 'bi-truck', tono: 'verde', color: '#16a34a', desc: 'Ve sus entregas y registra la conformidad.' },
  gerente: { icono: 'bi-briefcase', tono: 'violeta', color: '#7c3aed', desc: 'Ve todo: usuarios, reportes y recomendaciones.' },
}

// El gerente puede ver todo; los demás roles solo lo que su lista incluye.
export function puedeVer(rol, rolesPermitidos = []) {
  return rol === 'gerente' || rolesPermitidos.includes(rol)
}
