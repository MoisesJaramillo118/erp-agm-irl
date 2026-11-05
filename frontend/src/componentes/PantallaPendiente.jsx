import { Card } from 'react-bootstrap'

// Marcador de las pantallas que se construyen en sprints posteriores.
export default function PantallaPendiente({ titulo, sprint, historias }) {
  return (
    <>
      <h1 className="h4 mb-3">{titulo}</h1>
      <Card body className="text-center text-muted py-5">
        <p className="mb-1 fs-5">Esta pantalla se construye en el Sprint {sprint}.</p>
        <p className="mb-0 small">Historias de usuario: {historias}</p>
      </Card>
    </>
  )
}
