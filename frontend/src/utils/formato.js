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

export function formatoMoneda(valor) {
  const n = Number(valor ?? 0)
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
