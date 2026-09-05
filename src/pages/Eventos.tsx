import { PartyPopper, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventoFormModal } from '@/components/eventos/EventoFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox, Vacio } from '@/components/ui/estado'
import { Input, Select } from '@/components/ui/field'
import { useEventos } from '@/hooks/useEventos'
import {
  ESTADO_EVENTO_LABEL,
  TIPO_EVENTO_LABEL,
  type EstadoEvento,
} from '@/lib/database.types'
import { formatFecha, normalizar } from '@/lib/format'

type Filtro = EstadoEvento | 'vigentes' | 'todos'

const TONO: Record<EstadoEvento, 'success' | 'neutral' | 'warning'> = {
  publicado: 'success',
  borrador: 'warning',
  cerrado: 'neutral',
  archivado: 'neutral',
}

export default function Eventos() {
  const { data, loading, error, refetch } = useEventos()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('vigentes')
  const [modalAbierto, setModalAbierto] = useState(false)

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda)
    return data.filter((e) => {
      if (filtro === 'vigentes' && e.estado === 'archivado') return false
      if (filtro !== 'vigentes' && filtro !== 'todos' && e.estado !== filtro) return false
      if (!q) return true
      return (
        normalizar(e.nombre).includes(q) ||
        normalizar(e.slug).includes(q) ||
        normalizar(e.cliente_nombre ?? '').includes(q)
      )
    })
  }, [data, busqueda, filtro])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Eventos</h1>
          <p className="text-sm text-muted-foreground">Un evento por cada invitacion que vendés.</p>
        </div>
        <Button onClick={() => setModalAbierto(true)}>
          <Plus /> Nuevo evento
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, link o cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select
          className="w-auto"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
        >
          <option value="vigentes">Vigentes</option>
          <option value="borrador">Borradores</option>
          <option value="publicado">Publicados</option>
          <option value="cerrado">Cerrados</option>
          <option value="archivado">Archivados</option>
          <option value="todos">Todos</option>
        </Select>
      </div>

      {loading ? (
        <Cargando />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : filtrados.length === 0 ? (
        <Vacio
          icono={PartyPopper}
          titulo={data.length === 0 ? 'Todavia no hay eventos' : 'Sin resultados'}
          descripcion={
            data.length === 0
              ? 'Creá el primero para cargar su lista de invitados y generar los links.'
              : 'Probá con otra busqueda o cambiá el filtro.'
          }
          accion={
            data.length === 0 && (
              <Button onClick={() => setModalAbierto(true)}>
                <Plus /> Nuevo evento
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Evento</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/eventos/${e.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{e.nombre}</p>
                    <p className="text-xs text-muted-foreground">/i/{e.slug}</p>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{TIPO_EVENTO_LABEL[e.tipo]}</td>
                  <td className="px-4 py-2.5 tabular text-muted-foreground">
                    {formatFecha(e.fecha_evento)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.cliente_nombre || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge tono={TONO[e.estado]}>{ESTADO_EVENTO_LABEL[e.estado]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EventoFormModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onGuardado={(id) => {
          setModalAbierto(false)
          refetch()
          if (id) navigate(`/eventos/${id}`)
        }}
      />
    </div>
  )
}
