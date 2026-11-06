import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/cliente'

function conParametros(ruta, parametros) {
  const limpios = Object.fromEntries(Object.entries(parametros).filter(([, v]) => v !== '' && v != null))
  const texto = new URLSearchParams(limpios).toString()
  return texto ? `${ruta}?${texto}` : ruta
}

// Lista paginada de la API (DRF: {count, next, results}) con búsqueda y botón «Mostrar más».
export default function useListaPaginada(ruta, parametros = {}) {
  const clave = JSON.stringify(parametros)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [siguiente, setSiguiente] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    api(conParametros(ruta, JSON.parse(clave)))
      .then((d) => {
        if (!vigente) return
        setItems(d.results)
        setTotal(d.count)
        setSiguiente(d.next ? 2 : null)
      })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [ruta, clave, version])

  const mostrarMas = useCallback(async () => {
    if (!siguiente) return
    setCargando(true)
    try {
      const d = await api(conParametros(ruta, { ...JSON.parse(clave), page: siguiente }))
      setItems((previos) => [...previos, ...d.results])
      setSiguiente(d.next ? siguiente + 1 : null)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [ruta, clave, siguiente])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  return { items, total, cargando, error, hayMas: siguiente !== null, mostrarMas, recargar }
}
