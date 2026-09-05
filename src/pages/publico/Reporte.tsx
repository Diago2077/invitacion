import { Download, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando } from '@/components/ui/estado'
import { Input, Select } from '@/components/ui/field'
import { useReportePublico } from '@/hooks/usePublico'
import {
  ESTADO_INVITACION_LABEL,
  type EstadoInvitacion,
  type FilaReporte,
} from '@/lib/database.types'
import { descargarCsv } from '@/lib/exportar'
import { formatFecha, formatFechaHora, normalizar } from '@/lib/format'

const TONO: Record<EstadoInvitacion, 'success' | 'neutral' | 'warning' | 'danger'> = {
  confirmado: 'success',
  parcial: 'warning',
  rechazado: 'danger',
  pendiente: 'neutral',
}

/**
 * El tablero de solo lectura del cliente. Mismo dato que ve el panel, sin
 * login y sin poder tocar nada: quien tiene el link mira, nada mas.
 */
export default function Reporte() {
  const { token } = useParams<{ token: string }>()
  const { data, loading, error, refetch } = useReportePublico(token)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<EstadoInvitacion | 'todos'>('todos')

  const filas = useMemo(() => {
    const q = normalizar(busqueda)
    return (data?.invitaciones ?? []).filter((f) => {
      if (filtro !== 'todos' && f.estado !== filtro) return false
      if (!q) return true
      return (
        normalizar(f.nombre_grupo).includes(q) ||
        f.invitados.some((i) => normalizar(i.nombre).includes(q))
      )
    })
  }, [data, busqueda, filtro])

  if (loading) return <Cargando className="min-h-screen" texto="Cargando el reporte…" />

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">No pudimos abrir el reporte</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {error ?? 'Este link no es valido o ya no esta disponible.'}
          </p>
        </div>
      </div>
    )
  }

  const { evento, totales } = data

  function exportar() {
    const filasCsv: (string | number | null)[][] = [
      ['Grupo', 'Estado', 'Personas confirmadas', 'Telefono', 'Mesa', 'Invitados', 'Mensaje', 'Confirmado'],
      ...filas.map((f: FilaReporte) => [
        f.nombre_grupo,
        ESTADO_INVITACION_LABEL[f.estado],
        f.pases_confirmados,
        f.telefono,
        f.mesa,
        f.invitados
          .map((i) => `${i.nombre}${i.asiste === false ? ' (no)' : ''}`)
          .join(' | '),
        f.mensaje_invitado,
        f.confirmado_at ? formatFechaHora(f.confirmado_at) : '',
      ]),
    ]
    descargarCsv(`confirmaciones-${normalizar(evento.nombre).replace(/\s+/g, '-')}`, filasCsv)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Seguimiento de confirmaciones
          </p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">{evento.nombre}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatFecha(evento.fecha_evento)}
            {evento.confirmar_hasta && ` · confirmar hasta ${formatFecha(evento.confirmar_hasta)}`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tarjeta valor={totales.personas_confirmadas} label="Personas confirmadas" destacado />
          <Tarjeta valor={totales.personas_invitadas} label="Personas invitadas" />
          <Tarjeta valor={totales.pendientes} label="Sin responder" />
          <Tarjeta valor={totales.rechazadas} label="No asisten" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="max-w-xs flex-1"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Select
            className="w-auto"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as EstadoInvitacion | 'todos')}
          >
            <option value="todos">Todos</option>
            <option value="confirmado">Confirmados</option>
            <option value="parcial">Parciales</option>
            <option value="pendiente">Sin responder</option>
            <option value="rechazado">No asisten</option>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="icon" onClick={refetch} title="Actualizar">
              <RefreshCw />
            </Button>
            <Button variant="outline" onClick={exportar}>
              <Download /> Exportar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Grupo</th>
                <th className="px-4 py-2.5 font-medium">Personas</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Respondio</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.nombre_grupo + f.confirmado_at} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{f.nombre_grupo}</p>
                    {f.invitados.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {f.invitados
                          .map((i) => (i.asiste === false ? `${i.nombre} (no)` : i.nombre))
                          .join(', ')}
                      </p>
                    )}
                    {f.mensaje_invitado && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        “{f.mensaje_invitado}”
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular text-muted-foreground">
                    {f.pases_confirmados}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tono={TONO[f.estado]}>{ESTADO_INVITACION_LABEL[f.estado]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {f.confirmado_at ? formatFechaHora(f.confirmado_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {totales.invitaciones} invitaciones · {totales.vistas} abiertas
        </p>
      </main>
    </div>
  )
}

function Tarjeta({
  valor,
  label,
  destacado,
}: {
  valor: number
  label: string
  destacado?: boolean
}) {
  return (
    <div
      className={
        'rounded-lg border p-4 ' +
        (destacado ? 'border-primary/30 bg-primary/5' : 'border-border bg-card')
      }
    >
      <p
        className={
          'tabular text-2xl font-semibold ' + (destacado ? 'text-primary' : 'text-foreground')
        }
      >
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
