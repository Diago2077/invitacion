import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Cargando, ErrorBox } from '@/components/ui/estado'
import { useEvento } from '@/hooks/useEventos'
import type { InvitacionPublica, InvitadoPublico } from '@/lib/database.types'
import { obtenerPlantilla } from '@/plantillas'

/**
 * Vista previa desde el panel, con datos de mentira.
 *
 * Existe porque la invitacion publica necesita un token de invitacion, y un
 * evento recien creado todavia no tiene ninguna. Renderiza la misma
 * plantilla, asi que lo que se ve aca es exactamente lo que va a ver el
 * invitado -- solo que sin poder confirmar.
 */
const INVITACION_DEMO: InvitacionPublica = {
  token: 'vista-previa',
  nombre_grupo: 'Familia Gonzalez',
  saludo: null,
  modo_pases: 'nominal',
  pases: null,
  estado: 'pendiente',
  pases_confirmados: 0,
  mensaje_invitado: null,
  confirmado_at: null,
  mesa: null,
}

const INVITADOS_DEMO: InvitadoPublico[] = [
  {
    id: 'demo-1',
    nombre: 'Maria Gonzalez',
    es_menor: false,
    asiste: null,
    restriccion: null,
    origen: 'admin',
  },
  {
    id: 'demo-2',
    nombre: 'Jorge Gonzalez',
    es_menor: false,
    asiste: null,
    restriccion: null,
    origen: 'admin',
  },
]

export default function VistaPrevia() {
  const { id } = useParams<{ id: string }>()
  const { data: evento, loading } = useEvento(id)

  if (loading) return <Cargando className="min-h-screen" />
  if (!evento) return <ErrorBox mensaje="No se encontro el evento." />

  // Ver la nota en pages/publico/Invitacion.tsx: es una busqueda en el
  // registro de plantillas, no un componente creado en cada render.
  const Plantilla = obtenerPlantilla(evento.plantilla)

  return (
    <div className="relative">
      <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-[#3a2f2e] px-4 py-2 text-xs text-white">
        <Link to={`/eventos/${evento.id}`} className="inline-flex items-center gap-1.5 underline">
          <ArrowLeft className="size-3.5" /> Volver al panel
        </Link>
        <span className="opacity-70">Vista previa con invitados de ejemplo</span>
      </div>

      <Plantilla
        evento={{
          nombre: evento.nombre,
          tipo: evento.tipo,
          slug: evento.slug,
          fecha_evento: evento.fecha_evento,
          plantilla: evento.plantilla,
          contenido: evento.contenido ?? {},
          confirmar_hasta: evento.confirmar_hasta,
          estado: evento.estado,
        }}
        invitacion={INVITACION_DEMO}
        invitados={INVITADOS_DEMO}
        bloqueado="Vista previa: desde acá no se guardan confirmaciones."
        onConfirmado={() => {}}
      />
    </div>
  )
}
