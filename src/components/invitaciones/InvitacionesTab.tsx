import { Download, Eye, Pencil, Plus, Search, Share2, Trash2, Upload, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CompartirModal } from '@/components/invitaciones/CompartirModal'
import { ImportarModal, type FilaImportada } from '@/components/invitaciones/ImportarModal'
import {
  InvitacionFormModal,
  type DatosInvitacion,
} from '@/components/invitaciones/InvitacionFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox, Vacio } from '@/components/ui/estado'
import { Input, Select } from '@/components/ui/field'
import { ConfirmModal } from '@/components/ui/modal'
import { useInvitaciones } from '@/hooks/useInvitaciones'
import { urlInvitacion } from '@/lib/compartir'
import {
  ESTADO_INVITACION_LABEL,
  type Evento,
  type EstadoInvitacion,
  type InvitacionConInvitados,
} from '@/lib/database.types'
import { descargarCsv } from '@/lib/exportar'
import { formatFechaHora, normalizar } from '@/lib/format'
import { MODO_LABEL, pasesAsignados } from '@/lib/pases'

const TONO: Record<EstadoInvitacion, 'success' | 'neutral' | 'warning' | 'danger'> = {
  confirmado: 'success',
  parcial: 'warning',
  rechazado: 'danger',
  pendiente: 'neutral',
}

export function InvitacionesTab({ evento }: { evento: Evento }) {
  const {
    data,
    loading,
    error,
    refetch,
    crear,
    crearVarias,
    actualizar,
    reemplazarNombres,
    eliminar,
  } = useInvitaciones(evento.id)

  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<EstadoInvitacion | 'todos'>('todos')
  const [modalForm, setModalForm] = useState<InvitacionConInvitados | 'nueva' | null>(null)
  const [modalImportar, setModalImportar] = useState(false)
  const [modalCompartir, setModalCompartir] = useState<InvitacionConInvitados | null>(null)
  const [modalEliminar, setModalEliminar] = useState<InvitacionConInvitados | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const totales = useMemo(() => {
    let personasConfirmadas = 0
    let personasInvitadas = 0
    let pendientes = 0
    let vistas = 0
    for (const i of data) {
      personasConfirmadas += i.pases_confirmados
      personasInvitadas += pasesAsignados(
        i.modo_pases,
        i.pases,
        i.invitados.filter((x) => x.origen === 'admin').length,
      )
      if (i.estado === 'pendiente') pendientes++
      if (i.visto_at) vistas++
    }
    return { personasConfirmadas, personasInvitadas, pendientes, vistas }
  }, [data])

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda)
    return data.filter((i) => {
      if (filtro !== 'todos' && i.estado !== filtro) return false
      if (!q) return true
      return (
        normalizar(i.nombre_grupo).includes(q) ||
        normalizar(i.telefono ?? '').includes(q) ||
        i.invitados.some((x) => normalizar(x.nombre).includes(q))
      )
    })
  }, [data, busqueda, filtro])

  async function guardar(datos: DatosInvitacion) {
    const { id, nombres, ...campos } = datos

    if (id) {
      const { error: err } = await actualizar(id, campos)
      if (err) return { error: err }
      const { error: errNombres } = await reemplazarNombres(id, nombres)
      if (errNombres) return { error: errNombres }
      await refetch()
      return { error: null }
    }

    const { error: err } = await crear({
      invitacion: { evento_id: evento.id, ...campos },
      nombres,
    })
    if (err) return { error: err }
    await refetch()
    return { error: null }
  }

  async function importar(filas: FilaImportada[]) {
    const { creadas, error: err } = await crearVarias(
      filas.map((f) => ({
        invitacion: {
          evento_id: evento.id,
          nombre_grupo: f.nombre_grupo,
          saludo: null,
          modo_pases: f.modo_pases,
          pases: f.pases,
          telefono: f.telefono,
          email: f.email,
          mesa: f.mesa,
          notas: f.notas,
        },
        nombres: f.nombres,
      })),
    )
    await refetch()
    if (err) {
      toast.error(err)
      return { error: err }
    }
    toast.success(`${creadas} invitaciones importadas`)
    return { error: null }
  }

  async function borrar() {
    if (!modalEliminar) return
    setEliminando(true)
    const { error: err } = await eliminar(modalEliminar.id)
    setEliminando(false)
    if (err) {
      toast.error(err)
      return
    }
    toast.success('Invitacion eliminada')
    setModalEliminar(null)
    refetch()
  }

  /** Marca que el link ya salio, para saber a quien falta mandarle. */
  async function marcarEnviada(id: string) {
    const fila = data.find((i) => i.id === id)
    if (!fila || fila.enviado_at) return
    await actualizar(id, { enviado_at: new Date().toISOString() })
    refetch()
  }

  function exportar() {
    const filas: (string | number | null)[][] = [
      [
        'Grupo',
        'Integrantes',
        'Modo',
        'Pases',
        'Estado',
        'Confirmados',
        'Telefono',
        'Mesa',
        'Mensaje',
        'Confirmado',
        'Link',
      ],
      ...filtradas.map((i) => [
        i.nombre_grupo,
        i.invitados.map((x) => (x.asiste === false ? `${x.nombre} (no)` : x.nombre)).join(' | '),
        MODO_LABEL[i.modo_pases],
        i.modo_pases === 'nominal'
          ? i.invitados.filter((x) => x.origen === 'admin').length
          : i.pases,
        ESTADO_INVITACION_LABEL[i.estado],
        i.pases_confirmados,
        i.telefono,
        i.mesa,
        i.mensaje_invitado,
        i.confirmado_at ? formatFechaHora(i.confirmado_at) : '',
        urlInvitacion(evento, i.token),
      ]),
    ]
    descargarCsv(`invitados-${evento.slug}`, filas)
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tarjeta valor={totales.personasConfirmadas} label="Personas confirmadas" destacado />
        <Tarjeta valor={totales.personasInvitadas} label="Personas invitadas" />
        <Tarjeta valor={totales.pendientes} label="Sin responder" />
        <Tarjeta valor={totales.vistas} label="Invitaciones abiertas" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar grupo, invitado o telefono…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select
          className="w-auto"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as EstadoInvitacion | 'todos')}
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Sin responder</option>
          <option value="confirmado">Confirmados</option>
          <option value="parcial">Parciales</option>
          <option value="rechazado">No asisten</option>
        </Select>
        <Button variant="outline" onClick={() => setModalImportar(true)}>
          <Upload /> Importar
        </Button>
        <Button variant="outline" onClick={exportar} disabled={filtradas.length === 0}>
          <Download /> Exportar
        </Button>
        <Button onClick={() => setModalForm('nueva')}>
          <Plus /> Nueva invitacion
        </Button>
      </div>

      {loading ? (
        <Cargando />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : filtradas.length === 0 ? (
        <Vacio
          icono={Users}
          titulo={data.length === 0 ? 'Todavia no hay invitados' : 'Sin resultados'}
          descripcion={
            data.length === 0
              ? 'Cargalos de a uno o importá la lista desde un Excel.'
              : 'Probá con otra busqueda o cambiá el filtro.'
          }
          accion={
            data.length === 0 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModalImportar(true)}>
                  <Upload /> Importar
                </Button>
                <Button onClick={() => setModalForm('nueva')}>
                  <Plus /> Nueva invitacion
                </Button>
              </div>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Grupo</th>
                <th className="px-4 py-2.5 font-medium">Pases</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Actividad</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((i) => {
                const delAdmin = i.invitados.filter((x) => x.origen === 'admin')
                const asignados = pasesAsignados(i.modo_pases, i.pases, delAdmin.length)
                return (
                  <tr key={i.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{i.nombre_grupo}</p>
                      {i.invitados.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {i.invitados
                            .map((x) => (x.asiste === false ? `${x.nombre} (no)` : x.nombre))
                            .join(', ')}
                        </p>
                      )}
                      {i.mensaje_invitado && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          “{i.mensaje_invitado}”
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="tabular text-foreground">
                        {i.pases_confirmados}
                        <span className="text-muted-foreground">
                          /{i.modo_pases === 'abierto' && i.pases === null ? '—' : asignados}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {MODO_LABEL[i.modo_pases]}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tono={TONO[i.estado]}>{ESTADO_INVITACION_LABEL[i.estado]}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {i.confirmado_at ? (
                        <>Respondio {formatFechaHora(i.confirmado_at)}</>
                      ) : i.visto_at ? (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3" /> Abrio {formatFechaHora(i.visto_at)}
                        </span>
                      ) : i.enviado_at ? (
                        'Enviada, sin abrir'
                      ) : (
                        'Sin enviar'
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Compartir"
                          onClick={() => setModalCompartir(i)}
                        >
                          <Share2 />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => setModalForm(i)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          onClick={() => setModalEliminar(i)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <InvitacionFormModal
        abierto={modalForm !== null}
        evento={evento}
        invitacion={modalForm === 'nueva' ? null : modalForm}
        onCerrar={() => setModalForm(null)}
        onGuardar={guardar}
      />

      <ImportarModal
        abierto={modalImportar}
        evento={evento}
        existentes={data}
        onCerrar={() => setModalImportar(false)}
        onImportar={importar}
      />

      <CompartirModal
        abierto={modalCompartir !== null}
        evento={evento}
        invitacion={modalCompartir}
        onCerrar={() => setModalCompartir(null)}
        onEnviada={marcarEnviada}
      />

      <ConfirmModal
        abierto={modalEliminar !== null}
        titulo="Eliminar invitacion"
        mensaje={
          <>
            Se va a borrar <strong>{modalEliminar?.nombre_grupo}</strong> con sus invitados y su
            confirmacion. El link deja de funcionar.
          </>
        }
        procesando={eliminando}
        onConfirmar={borrar}
        onCancelar={() => setModalEliminar(null)}
      />
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
