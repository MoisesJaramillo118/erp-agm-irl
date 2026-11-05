// Cliente de API común a todos los módulos: agrega el token JWT, renueva el token vencido
// y convierte los errores del servidor en mensajes en español.
const BASE = import.meta.env.VITE_API_URL || '/api'
const CLAVE_SESION = 'erp_agm_sesion'

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) || null
  } catch {
    return null
  }
}

export function guardarSesion(sesion) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
}

export function borrarSesion() {
  localStorage.removeItem(CLAVE_SESION)
}

export class ErrorApi extends Error {
  constructor(estado, datos) {
    super(mensajeDeError(estado, datos))
    this.estado = estado
    this.datos = datos
  }
}

function mensajeDeError(estado, datos) {
  if (estado === 0) return 'No hay conexión con el servidor. Revisa que el sistema esté encendido.'
  if (estado === 401) return 'Usuario o contraseña incorrectos, o la sesión venció.'
  if (estado === 403) return 'Tu rol no tiene permiso para esta acción.'
  if (datos && typeof datos === 'object') {
    if (typeof datos.detail === 'string') return datos.detail
    const primero = Object.values(datos).flat()[0]
    if (typeof primero === 'string') return primero
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}

async function pedir(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const cabeceras = { Accept: 'application/json' }
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  if (token) cabeceras.Authorization = `Bearer ${token}`
  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi(0, null)
  }
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos)
  return datos
}

async function renovarToken() {
  const sesion = leerSesion()
  if (!sesion?.refresh) return null
  try {
    const { access } = await pedir('/usuarios/refrescar/', { metodo: 'POST', cuerpo: { refresh: sesion.refresh } })
    guardarSesion({ ...sesion, access })
    return access
  } catch {
    return null
  }
}

// Llamada autenticada. Si el token venció (401), se renueva una vez y se reintenta.
export async function api(ruta, opciones = {}) {
  const sesion = leerSesion()
  try {
    return await pedir(ruta, { ...opciones, token: sesion?.access })
  } catch (error) {
    if (error.estado === 401 && sesion?.refresh) {
      const nuevo = await renovarToken()
      if (nuevo) return pedir(ruta, { ...opciones, token: nuevo })
      borrarSesion()
      window.dispatchEvent(new Event('sesion-vencida'))
    }
    throw error
  }
}

export async function iniciarSesion(username, password) {
  const datos = await pedir('/usuarios/login/', { metodo: 'POST', cuerpo: { username, password } })
  guardarSesion({ access: datos.access, refresh: datos.refresh })
  return datos.usuario
}
