import ventas from '../modulos/ventas/rutas'
import inventario from '../modulos/inventario/rutas'
import distribucion from '../modulos/distribucion/rutas'
import recomendaciones from '../modulos/recomendaciones/rutas'
import usuarios from '../modulos/usuarios/rutas'
import { puedeVer } from './roles'

// Cada módulo aporta sus secciones y pantallas. Este mismo listado arma el menú lateral
// y las rutas protegidas, así que el menú y los permisos nunca se desfasan.
export const MODULOS = [ventas, inventario, distribucion, recomendaciones, usuarios]

export const TODAS_LAS_RUTAS = MODULOS.flatMap((m) => m.rutas)

// Menú del usuario: solo las secciones y pantallas que su rol puede ver.
export function menuPara(rol) {
  return MODULOS.map((m) => ({
    titulo: m.titulo,
    rutas: m.rutas.filter((r) => puedeVer(rol, r.roles)),
  })).filter((s) => s.rutas.length > 0)
}
