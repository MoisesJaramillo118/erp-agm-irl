import { useId } from 'react'

// Marca del sistema: una «A» blanca sobre un cuadrado azul redondeado.
export default function Logo({ tamano = 34 }) {
  const id = useId()
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path d="M9.5 22.5 16 9.5l6.5 13" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.3 18h7.4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
