import { useEffect, useState } from 'react'

// Devuelve el valor solo cuando deja de cambiar por ``ms`` milisegundos (para no buscar en cada tecla).
export default function useDebounce(valor, ms = 300) {
  const [estable, setEstable] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setEstable(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return estable
}
