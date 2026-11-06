import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './estilos/estilos.scss'
import App from './App'
import { AuthProvider } from './contexto/AuthContext'
import { NotificacionesProvider } from './contexto/Notificaciones'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificacionesProvider>
          <App />
        </NotificacionesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
