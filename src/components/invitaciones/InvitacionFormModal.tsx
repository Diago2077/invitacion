import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { Evento, InvitacionConInvitados, ModoPases } from '@/lib/database.types'
import { MODO_DESC, MODO_LABEL } from '@/lib/pases'

interface Form {
  nombre_grupo: string
  saludo: string
  modo_pases: ModoPases
  pases: string
  telefono: string
  email: string
  mesa: string
  notas: string
  nombres: string
}

/** Lo que el modal entrega ya limpio y validado. Sin `id` = alta. */
export interface DatosInvitacion {
  id?: string
  nombre_grupo: string
  saludo: string | null
  modo_pases: ModoPases
  pases: number | null
  telefono: string | null
  email: string | null
  mesa: string | null
  notas: string | null
  nombres: string[]
}

/**
 * Alta y edicion de una invitacion (un grupo/familia).
 *
 * El modo de pases se elige aca, invitacion por invitacion: es la decision
 * que pediste que fuera siempre tuya y nunca del invitado.
 */
export function InvitacionFormModal({
  abierto,
  evento,
  invitacion,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean
  evento: Evento
  /** Si viene, se edita; si no, se da de alta. */
  invitacion: InvitacionConInvitados | null
  onCerrar: () => void
  onGuardar: (datos: DatosInvitacion) => Promise<{ error: string | null }>
}) {
  const [form, setForm] = useState<Form>(() => vacio(evento.modo_pases_default))
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setForm(
      invitacion
        ? {
            nombre_grupo: invitacion.nombre_grupo,
            saludo: invitacion.saludo ?? '',
            modo_pases: invitacion.modo_pases,
            pases: invitacion.pases === null ? '' : String(invitacion.pases),
            telefono: invitacion.telefono ?? '',
            email: invitacion.email ?? '',
            mesa: invitacion.mesa ?? '',
            notas: invitacion.notas ?? '',
            nombres: invitacion.invitados
              .filter((i) => i.origen === 'admin')
              .map((i) => i.nombre)
              .join('\n'),
          }
        : vacio(evento.modo_pases_default),
    )
  }, [abierto, invitacion, evento.modo_pases_default])

  function set<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  const nombres = form.nombres
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (guardando) return

    const nombre_grupo = form.nombre_grupo.trim()
    if (!nombre_grupo) {
      setError('Poné el nombre del grupo o de la persona.')
      return
    }
    if (form.modo_pases === 'nominal' && nombres.length === 0) {
      setError('En modo "personas especificas" hay que cargar al menos un nombre.')
      return
    }
    const pases = form.pases.trim() === '' ? null : Number(form.pases)
    if (form.modo_pases === 'cupo' && (pases === null || pases < 1)) {
      setError('Indicá cuantos lugares tiene esta invitacion.')
      return
    }
    if (pases !== null && (!Number.isInteger(pases) || pases < 0)) {
      setError('La cantidad de pases tiene que ser un numero entero.')
      return
    }

    setError(null)
    setGuardando(true)
    const { error: err } = await onGuardar({
      id: invitacion?.id,
      nombre_grupo,
      saludo: form.saludo.trim() || null,
      modo_pases: form.modo_pases,
      // En nominal el cupo son los nombres cargados: guardar ademas un numero
      // suelto solo daria lugar a que los dos digan cosas distintas.
      pases: form.modo_pases === 'nominal' ? null : pases,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      mesa: form.mesa.trim() || null,
      notas: form.notas.trim() || null,
      nombres,
    })
    setGuardando(false)

    if (err) {
      setError(err)
      return
    }
    toast.success(invitacion ? 'Invitacion actualizada' : 'Invitacion creada')
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      titulo={invitacion ? 'Editar invitacion' : 'Nueva invitacion'}
      descripcion="Una invitacion por familia o por grupo: comparten un solo link."
      onCerrar={onCerrar}
      ancho="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button form="form-invitacion" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-invitacion" onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Grupo o persona" hint="Como figura en tu lista.">
            <Input
              value={form.nombre_grupo}
              onChange={(e) => set('nombre_grupo', e.target.value)}
              placeholder="Familia Gonzalez"
              required
              autoFocus
            />
          </Field>
          <Field label="Saludo en la invitacion" hint="Si lo dejás vacio usa el nombre del grupo.">
            <Input
              value={form.saludo}
              onChange={(e) => set('saludo', e.target.value)}
              placeholder="Querida familia Gonzalez"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modo de pases" hint={MODO_DESC[form.modo_pases]}>
            <Select
              value={form.modo_pases}
              onChange={(e) => set('modo_pases', e.target.value as ModoPases)}
            >
              {Object.entries(MODO_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {form.modo_pases === 'nominal' ? (
            <Field label="Lugares" hint="En este modo salen de los nombres cargados abajo.">
              <Input value={nombres.length} readOnly disabled />
            </Field>
          ) : (
            <Field
              label={form.modo_pases === 'cupo' ? 'Lugares asignados' : 'Maximo de personas'}
              hint={
                form.modo_pases === 'abierto'
                  ? 'Vacio = sin tope. El invitado dice cuantos van.'
                  : undefined
              }
            >
              <Input
                type="number"
                min={form.modo_pases === 'cupo' ? 1 : 0}
                value={form.pases}
                onChange={(e) => set('pases', e.target.value)}
                placeholder={form.modo_pases === 'cupo' ? '2' : 'sin tope'}
              />
            </Field>
          )}
        </div>

        <Field
          label="Nombres"
          hint={
            form.modo_pases === 'nominal'
              ? 'Uno por linea. El invitado va a marcar quien va y quien no.'
              : 'Opcional. Uno por linea, por si ya los sabés.'
          }
        >
          <Textarea
            value={form.nombres}
            onChange={(e) => set('nombres', e.target.value)}
            className="min-h-28"
            placeholder={'Maria Gonzalez\nJorge Gonzalez'}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Telefono" hint="Para abrir WhatsApp directo.">
            <Input
              value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              placeholder="0981 123 456"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
          <Field label="Mesa">
            <Input value={form.mesa} onChange={(e) => set('mesa', e.target.value)} placeholder="7" />
          </Field>
        </div>

        <Field label="Notas internas" hint="No se muestran en la invitacion.">
          <Textarea value={form.notas} onChange={(e) => set('notas', e.target.value)} />
        </Field>

        {error && <ErrorBox mensaje={error} />}
      </form>
    </Modal>
  )
}

function vacio(modo: ModoPases): Form {
  return {
    nombre_grupo: '',
    saludo: '',
    modo_pases: modo,
    pases: modo === 'cupo' ? '2' : '',
    telefono: '',
    email: '',
    mesa: '',
    notas: '',
    nombres: '',
  }
}
