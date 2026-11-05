import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './componentes/Layout'
import RutaProtegida from './componentes/RutaProtegida'
import { TODAS_LAS_RUTAS } from './config/menu'
import Inicio from './paginas/Inicio'
import Login from './paginas/Login'
import NoAutorizado from './paginas/NoAutorizado'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="/no-autorizado" element={<NoAutorizado />} />
        {TODAS_LAS_RUTAS.map((r) => (
          <Route
            key={r.ruta}
            path={r.ruta}
            element={<RutaProtegida roles={r.roles}>{r.elemento}</RutaProtegida>}
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
