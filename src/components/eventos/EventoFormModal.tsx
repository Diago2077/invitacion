import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useEventos } from '@/hooks/useEventos'
import {
  TIPO_EVENTO_LABEL,
  type Evento,
  type EstadoEvento,
  type ModoPases,
  type TipoEvento,
} from '@/lib/database.types'
import { paraInputDateTime, slugify } from '@/lib/format'
import { MODO_DESC, MODO_LABEL } from '@/lib/pases'

interface Form {
  nombre: string
  slug: string
  tipo: TipoEvento
  fecha_evento: string
  confirmar_hasta: string
  modo_pases_default: ModoPases
  estado: EstadoEvento
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string
  notas: string
}

const VACIO: Form = {
  nombre: '',
  slug: '',
  tipo: 'casamiento',
  fecha_evento: '',
  confirmar_hasta: '',
  modo_pases_default: 'nominal',
  estado: 'borrador',
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_email: '',
  notas: '',
}

export function EventoFormModal({
  abierto,
  evento,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean
  /** Si viene, el modal edita; si no, da de alta. */
  evento?: Evento
  onCerrar: () => void
  onGuardado: (id?: string) => void
}) {
  const { crear, actualizar } = useEventos()
  const [form, setForm] = useState<Form>(VACIO)
  // Mientras nadie lo toque, el slug sigue al nombre. Despues queda quieto:
  // cambiarlo solo despues de haber repartido los links rompe todos.
  const [slugManual, setSlugManual] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setSlugManual(Boolean(evento))
    setForm(
      evento
        ? {
            nombre: evento.nombre,
            slug: evento.slug,
            tipo: evento.tipo,
            fecha_evento: paraInputDateTime(evento.fecha_evento),
            confirmar_hasta: evento.confirmar_hasta ?? '',
            modo_pases_default: evento.modo_pases_default,
            estado: evento.estado,
            cliente_nombre: evento.cliente_nombre ?? '',
            cliente_telefono: evento.cliente_telefono ?? '',
            cliente_email: evento.cliente_email ?? '',
            notas: evento.notas ?? '',
          }
        : VACIO,
    )
  }, [abierto, evento])

  function set<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (guardando) return

    const nombre = form.nombre.trim()
    const slug = slugify(form.slug || nombre)
    if (!nombre) {
      setError('Poné un nombre para el evento.')
      return
    }
    if (!slug) {
      setError('El link no puede quedar vacio.')
      return
    }

    const payload = {
      nombre,
      slug,
      tipo: form.tipo,
      fecha_evento: form.fecha_evento ? new Date(form.fecha_evento).toISOString() : null,
      confirmar_hasta: form.confirmar_hasta || null,
      modo_pases_default: form.modo_pases_default,
      estado: form.estado,
      cliente_nombre: form.cliente_nombre.trim() || null,
      cliente_telefono: form.cliente_telefono.trim() || null,
      cliente_email: form.cliente_email.trim() || null,
      notas: form.notas.trim() || null,
    }

    setError(null)
    setGuardando(true)

    if (evento) {
      const { error: err } = await actualizar(evento.id, payload)
      setGuardando(false)
      if (err) {
        setError(err)
        return
      }
      toast.success('Evento actualizado')
      onGuardado(evento.id)
      return
    }

    const { data, error: err } = await crear({
      ...payload,
      plantilla: 'clasica',
      // El contenido arranca con lo minimo para que la vista previa muestre
      // algo apenas se crea el evento; el resto se completa en la pestana
      // "Invitacion".
      contenido: { titulo: nombre },
    })
    setGuardando(false)
    if (err) {
      setError(err)
      return
    }
    toast.success('Evento creado')
    onGuardado(data?.id)
  }

  return (
    <Modal
      abierto={abierto}
      titulo={evento ? 'Editar evento' : 'Nuevo evento'}
      descripcion={
        evento ? undefined : 'Despues vas a poder cargar el contenido y la lista de invitados.'
      }
      onCerrar={onCerrar}
      ancho="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button form="form-evento" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-evento" onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del evento" hint="Como lo vas a ver vos en el panel.">
            <Input
              value={form.nombre}
              onChange={(e) => {
                set('nombre', e.target.value)
                if (!slugManual) set('slug', slugify(e.target.value))
              }}
              placeholder="Ana & Luis"
              required
              autoFocus
            />
          </Field>

          <Field label="Tipo">
            <Select value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoEvento)}>
              {Object.entries(TIPO_EVENTO_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Link"
          hint={`Los invitados van a recibir /i/${form.slug || 'nombre'}/xxxxxxxx`}
          warning={
            evento && slugify(form.slug) !== evento.slug
              ? 'Si ya repartiste los links, cambiar esto los rompe todos.'
              : undefined
          }
        >
          <Input
            value={form.slug}
            onChange={(e) => {
              setSlugManual(true)
              set('slug', e.target.value)
            }}
            onBlur={(e) => set('slug', slugify(e.target.value))}
            placeholder="ana-y-luis"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha y hora del evento">
            <Input
              type="datetime-local"
              value={form.fecha_evento}
              onChange={(e) => set('fecha_evento', e.target.value)}
            />
          </Field>

          <Field label="Confirmar hasta" hint="Despues de esta fecha ya no se puede confirmar.">
            <Input
              type="date"
              value={form.confirmar_hasta}
              onChange={(e) => set('confirmar_hasta', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modo de pases por defecto" hint={MODO_DESC[form.modo_pases_default]}>
            <Select
              value={form.modo_pases_default}
              onChange={(e) => set('modo_pases_default', e.target.value as ModoPases)}
            >
              {Object.entries(MODO_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Estado"
            hint={
              form.estado === 'publicado'
                ? 'Los invitados pueden ver y confirmar.'
                : form.estado === 'borrador'
                  ? 'El link funciona como vista previa, sin confirmar.'
                  : 'Se ve la invitacion, pero no se aceptan confirmaciones.'
            }
          >
            <Select
              value={form.estado}
              onChange={(e) => set('estado', e.target.value as EstadoEvento)}
            >
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
              <option value="cerrado">Cerrado</option>
              <option value="archivado">Archivado</option>
            </Select>
          </Field>
        </div>

        <fieldset className="rounded-md border border-border p-4">
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Cliente (no entra al panel)
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nombre">
              <Input
                value={form.cliente_nombre}
                onChange={(e) => set('cliente_nombre', e.target.value)}
              />
            </Field>
            <Field label="Telefono">
              <Input
                value={form.cliente_telefono}
                onChange={(e) => set('cliente_telefono', e.target.value)}
                placeholder="0981 123 456"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.cliente_email}
                onChange={(e) => set('cliente_email', e.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <Field label="Notas internas" hint="Solo las ves vos.">
          <Textarea value={form.notas} onChange={(e) => set('notas', e.target.value)} />
        </Field>

        {error && <ErrorBox mensaje={error} />}
      </form>
    </Modal>
  )
}
