const COLORES = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#db2777', '#4f46e5', '#0d9488']

function iniciales(texto = '') {
  const partes = texto.replace(/DEMO/g, '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function colorDe(texto = '') {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORES[h % COLORES.length]
}

// Círculo con las iniciales del nombre. El color sale del propio nombre (o se fija con ``color``).
export default function Avatar({ nombre, color, tamano }) {
  return (
    <span className={`avatar ${tamano ? `avatar-${tamano}` : ''}`} style={{ background: color || colorDe(nombre) }} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  )
}
