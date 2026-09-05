import { ArrowLeft, Eye, Heart, Pencil, Share2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ContenidoTab } from '@/components/eventos/ContenidoTab'
import { CompartirTab } from '@/components/eventos/CompartirTab'
import { InvitacionesTab } from '@/components/invitaciones/InvitacionesTab'
import { EventoFormModal } from '@/components/eventos/EventoFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox } from '@/components/ui/estado'
import { useEvento, useEventos } from '@/hooks/useEventos'
import { ESTADO_EVENTO_LABEL, TIPO_EVENTO_LABEL } from '@/lib/database.types'
import { formatFecha, formatHora } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'invitados' | 'invitacion' | 'compartir'

export default function EventoDetalle() {
  const { id } = useParams<{ id: string }>()
  const { data: evento, loading, refetch } = useEvento(id)
  const { actualizar } = useEventos()
  const [tab, setTab] = useState<Tab>('invitados')
  const [modalEdicion, setModalEdicion] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  async function publicar() {
    if (!evento || cambiandoEstado) return
    const nuevo = evento.estado === 'publicado' ? 'cerrado' : 'publicado'
    setCambiandoEstado(true)
    const { error } = await actualizar(evento.id, { estado: nuevo })
    setCambiandoEstado(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success(
      nuevo === 'publicado'
        ? 'Invitacion publicada: ya se puede confirmar.'
        : 'Confirmaciones cerradas.',
    )
    refetch()
  }

  if (loading) return <Cargando />
  if (!evento) return <ErrorBox mensaje="No se encontro el evento." />

  const hora = formatHora(evento.fecha_evento)

  return (
    <div>
      <Link
        to="/eventos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Eventos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">{evento.nombre}</h1>
            <Badge
              tono={
                evento.estado === 'publicado'
                  ? 'success'
                  : evento.estado === 'borrador'
                    ? 'warning'
                    : 'neutral'
              }
            >
              {ESTADO_EVENTO_LABEL[evento.estado]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {TIPO_EVENTO_LABEL[evento.tipo]}
            {evento.fecha_evento && ` · ${formatFecha(evento.fecha_evento)}`}
            {hora && ` · ${hora}`}
            {evento.confirmar_hasta && ` · confirmar hasta ${formatFecha(evento.confirmar_hasta)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/eventos/${evento.id}/vista-previa`}
            className="inline-flex h-9.5 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Eye className="size-4" /> Vista previa
          </Link>
          <Button variant="outline" onClick={() => setModalEdicion(true)}>
            <Pencil /> Editar
          </Button>
          <Button onClick={publicar} disabled={cambiandoEstado}>
            {evento.estado === 'publicado' ? 'Cerrar confirmaciones' : 'Publicar'}
          </Button>
        </div>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        <TabButton activo={tab === 'invitados'} onClick={() => setTab('invitados')} icono={Users}>
          Invitados
        </TabButton>
        <TabButton activo={tab === 'invitacion'} onClick={() => setTab('invitacion')} icono={Heart}>
          Invitacion
        </TabButton>
        <TabButton activo={tab === 'compartir'} onClick={() => setTab('compartir')} icono={Share2}>
          Compartir
        </TabButton>
      </div>

      {tab === 'invitados' && <InvitacionesTab evento={evento} />}
      {tab === 'invitacion' && <ContenidoTab evento={evento} onGuardado={refetch} />}
      {tab === 'compartir' && <CompartirTab evento={evento} />}

      <EventoFormModal
        abierto={modalEdicion}
        evento={evento}
        onCerrar={() => setModalEdicion(false)}
        onGuardado={() => {
          setModalEdicion(false)
          refetch()
        }}
      />
    </div>
  )
}

function TabButton({
  activo,
  onClick,
  icono: Icono,
  children,
}: {
  activo: boolean
  onClick: () => void
  icono: typeof Users
  children: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        activo
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icono className="size-4" />
      {children}
    </button>
  )
}
