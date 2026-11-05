import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, borrarSesion, iniciarSesion, leerSesion } from '../api/cliente'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(Boolean(leerSesion()))

  const salir = useCallback(() => {
    borrarSesion()
    setUsuario(null)
  }, [])

  // Al abrir la página, si hay una sesión guardada se confirma con el servidor (él manda sobre el rol).
  useEffect(() => {
    if (!leerSesion()) return
    api('/usuarios/yo/')
      .then(setUsuario)
      .catch(() => borrarSesion())
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    window.addEventListener('sesion-vencida', salir)
    return () => window.removeEventListener('sesion-vencida', salir)
  }, [salir])

  const entrar = useCallback(async (username, password) => {
    const u = await iniciarSesion(username, password)
    setUsuario(u)
    return u
  }, [])

  const valor = useMemo(() => ({ usuario, cargando, entrar, salir }), [usuario, cargando, entrar, salir])
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
