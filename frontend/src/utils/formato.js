// Formatos de la interfaz: fechas dd/mm/aaaa, moneda en S/ y hora de Lima.
const ZONA = 'America/Lima'

export function formatoFecha(valor) {
  if (!valor) return '—'
  // Las fechas "aaaa-mm-dd" (sin hora) se leen tal cual, sin cambiarlas por zona horaria.
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-')
    return `${d}/${m}/${a}`
  }
  return new Date(valor).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA,
  })
}

export function formatoFechaHora(valor) {
  if (!valor) return '—'
  const f = new Date(valor)
  const fecha = f.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA })
  const hora = f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA })
  return `${fecha} ${hora}`
}

// Fecha de hoy en Lima como "aaaa-mm-dd" (el formato de los campos de fecha y de la API).
export function hoyLima(diasMas = 0) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: ZONA })
  if (!diasMas) return hoy
  const f = new Date(`${hoy}T12:00:00Z`)
  f.setUTCDate(f.getUTCDate() + diasMas)
  return f.toISOString().slice(0, 10)
}

// «Jueves, 06/11/2026» (día de la semana + fecha dd/mm/aaaa, hora de Lima).
export function fechaDeHoy() {
  const ahora = new Date()
  const dia = ahora.toLocaleDateString('es-PE', { weekday: 'long', timeZone: ZONA })
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${formatoFecha(ahora)}`
}

// Saludo según la hora de Lima.
export function saludo() {
  const hora = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: ZONA }))
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function formatoHora(valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA })
}

export function formatoMoneda(valor) {
  const n = Number(valor ?? 0)
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
