import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Toast, ToastContainer } from 'react-bootstrap'

const NotificacionesContext = createContext(() => {})

const ESTILOS = {
  exito: { icono: 'bi-check-circle-fill', color: 'text-success' },
  error: { icono: 'bi-x-circle-fill', color: 'text-danger' },
  info: { icono: 'bi-info-circle-fill', color: 'text-primary' },
}

// Avisos breves en la esquina (por ejemplo, «Cliente registrado»). Se cierran solos.
export function NotificacionesProvider({ children }) {
  const [avisos, setAvisos] = useState([])

  const notificar = useCallback((texto, tipo = 'exito') => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, texto, tipo }])
  }, [])

  const quitar = (id) => setAvisos((a) => a.filter((x) => x.id !== id))
  const valor = useMemo(() => notificar, [notificar])

  return (
    <NotificacionesContext.Provider value={valor}>
      {children}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 2000 }}>
        {avisos.map((a) => {
          const e = ESTILOS[a.tipo] || ESTILOS.info
          return (
            <Toast key={a.id} className="toast-agm" onClose={() => quitar(a.id)} delay={4500} autohide>
              <Toast.Body>
                <i className={`bi ${e.icono} ${e.color} fs-5`} aria-hidden="true" />
                <span className="flex-grow-1">{a.texto}</span>
                <button type="button" className="btn-close btn-close-sm" aria-label="Cerrar" onClick={() => quitar(a.id)} />
              </Toast.Body>
            </Toast>
          )
        })}
      </ToastContainer>
    </NotificacionesContext.Provider>
  )
}

export function useNotificar() {
  return useContext(NotificacionesContext)
}
