import { CalendarHeart, PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Cargando } from '@/components/ui/estado'
import { useAuth } from '@/hooks/useAuth'
import { useEventos } from '@/hooks/useEventos'
import { diasHasta, formatFecha } from '@/lib/format'
import { ESTADO_EVENTO_LABEL, TIPO_EVENTO_LABEL } from '@/lib/database.types'

function cuentaRegresiva(fecha: string | null): string {
  const dias = diasHasta(fecha)
  if (dias === null) return 'Sin fecha'
  if (dias === 0) return '¡Es hoy!'
  if (dias === 1) return 'Manana'
  if (dias < 0) return `Hace ${Math.abs(dias)} dias`
  return `En ${dias} dias`
}

export default function Inicio() {
  const { perfil } = useAuth()
  const { data, loading } = useEventos()

  const primerNombre = perfil?.nombre?.split(' ')[0] ?? ''
  const activos = data.filter((e) => e.estado !== 'archivado')
  // Los que todavia no pasaron, del mas proximo al mas lejano: es la unica
  // lista que importa mirar todos los dias.
  const proximos = activos
    .filter((e) => (diasHasta(e.fecha_evento) ?? -1) >= 0)
    .sort((a, b) => (a.fecha_evento ?? '').localeCompare(b.fecha_evento ?? ''))
    .slice(0, 5)

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-foreground">
          Hola{primerNombre ? `, ${primerNombre}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="tabular">{activos.length}</span>{' '}
          {activos.length === 1 ? 'evento' : 'eventos'} ·{' '}
          <span className="tabular">{activos.filter((e) => e.estado === 'publicado').length}</span>{' '}
          publicados
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/eventos"
          className="group rounded-lg border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="mb-3 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <PartyPopper className="size-4.5" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">Eventos</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Cada casamiento con su invitacion, su lista de invitados y sus confirmaciones.
          </p>
        </Link>

        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <span className="mb-3 flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <CalendarHeart className="size-4.5" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">Proximos</h2>

          {loading ? (
            <Cargando className="py-6" />
          ) : proximos.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No hay eventos con fecha por delante.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {proximos.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <Link to={`/eventos/${e.id}`} className="min-w-0 hover:underline">
                    <p className="truncate text-sm text-foreground">{e.nombre}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {TIPO_EVENTO_LABEL[e.tipo]} · {formatFecha(e.fecha_evento)}
                    </p>
                  </Link>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-foreground">
                      {cuentaRegresiva(e.fecha_evento)}
                    </p>
                    <Badge tono={e.estado === 'publicado' ? 'success' : 'neutral'}>
                      {ESTADO_EVENTO_LABEL[e.estado]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
