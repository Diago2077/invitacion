import { Check, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import type { InvitacionPublica, InvitadoPublico } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import { textoCupo, validarPases } from '@/lib/pases'
import { cn } from '@/lib/utils'

const CAJA = 'rounded-lg border bg-white/70 p-5 sm:p-6'
const BOTON =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-colors disabled:opacity-60'

/**
 * El formulario de confirmacion. Los tres modos comparten el mismo alta y el
 * mismo boton; lo unico que cambia es como se dice "cuantos van".
 *
 * Las validaciones de aca son para avisar antes de mandar. Las que mandan
 * son las de confirmar_invitacion() en SQL: este formulario se puede
 * saltear, esa funcion no.
 *
 * Los colores salen de las variables --inv-* (ver index.css), no de hex
 * fijo: asi lo puede usar cualquier plantilla con su propia paleta, cada una
 * pisando esas variables en su nodo raiz.
 */
export function FormularioRsvp({
  invitacion,
  invitados,
  bloqueado,
  onConfirmado,
}: {
  invitacion: InvitacionPublica
  invitados: InvitadoPublico[]
  /** Motivo por el que no se puede confirmar (vista previa, cerrado, vencido). */
  bloqueado: string | null
  onConfirmado: () => void
}) {
  const delAdmin = invitados.filter((i) => i.origen === 'admin')
  const yaRespondio = invitacion.estado !== 'pendiente'

  const [editando, setEditando] = useState(!yaRespondio)
  const [asiste, setAsiste] = useState<boolean | null>(
    yaRespondio ? invitacion.estado !== 'rechazado' : null,
  )
  const [marcados, setMarcados] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(delAdmin.map((i) => [i.id, i.asiste ?? true])),
  )
  const [cantidad, setCantidad] = useState(
    invitacion.pases_confirmados || (invitacion.modo_pases === 'cupo' ? (invitacion.pases ?? 1) : 1),
  )
  const [nombres, setNombres] = useState<string[]>(() =>
    invitados.filter((i) => i.origen === 'invitado').map((i) => i.nombre),
  )
  const [mensaje, setMensaje] = useState(invitacion.mensaje_invitado ?? '')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const nominal = invitacion.modo_pases === 'nominal' && delAdmin.length > 0
  const cuantos = nominal ? delAdmin.filter((i) => marcados[i.id]).length : cantidad

  async function confirmar() {
    if (enviando || asiste === null) return

    if (asiste) {
      if (nominal) {
        if (cuantos === 0) {
          setError('Marcá al menos una persona, o elegí "No podemos".')
          return
        }
      } else {
        const err = validarPases(invitacion.modo_pases, invitacion.pases, cantidad)
        if (err) {
          setError(err)
          return
        }
      }
    }

    const payload = asiste
      ? nominal
        ? delAdmin.map((i) => ({ id: i.id, asiste: Boolean(marcados[i.id]) }))
        : nombres
            .slice(0, cantidad)
            .map((n) => n.trim())
            .filter(Boolean)
            .map((nombre) => ({ nombre }))
      : []

    setError(null)
    setEnviando(true)
    const { data, error: err } = await supabase.rpc('confirmar_invitacion', {
      p_token: invitacion.token,
      p_asiste: asiste,
      p_pases: asiste ? cuantos : 0,
      p_invitados: payload,
      p_mensaje: mensaje.trim() || null,
    })
    setEnviando(false)

    const respuesta = data as { ok: boolean; error?: string } | null
    if (err || !respuesta) {
      setError('No pudimos guardar tu respuesta. Probá de nuevo en un momento.')
      return
    }
    if (!respuesta.ok) {
      setError(respuesta.error ?? 'No pudimos guardar tu respuesta.')
      return
    }

    setEditando(false)
    onConfirmado()
  }

  if (bloqueado) {
    return (
      <div className={CAJA} style={{ borderColor: 'var(--inv-border)' }}>
        <p className="text-center text-sm" style={{ color: 'var(--inv-muted)' }}>
          {bloqueado}
        </p>
        {yaRespondio && (
          <p className="mt-3 text-center text-sm" style={{ color: 'var(--inv-text)' }}>
            {invitacion.estado === 'rechazado'
              ? 'Tu respuesta quedo registrada: no van a poder asistir.'
              : `Tu respuesta quedo registrada: ${invitacion.pases_confirmados} ${
                  invitacion.pases_confirmados === 1 ? 'persona' : 'personas'
                }.`}
          </p>
        )}
      </div>
    )
  }

  // Ya respondio y no esta editando: se le muestra que quedo guardado, con la
  // puerta abierta a cambiarlo (los planes cambian, y es mejor que avisen).
  if (!editando) {
    return (
      <div className={cn(CAJA, 'text-center')} style={{ borderColor: 'var(--inv-border)' }}>
        <div
          className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inv-primary) 12%, transparent)' }}
        >
          {invitacion.estado === 'rechazado' ? (
            <X className="size-5" style={{ color: 'var(--inv-primary)' }} />
          ) : (
            <Check className="size-5" style={{ color: 'var(--inv-primary)' }} />
          )}
        </div>
        <p className="font-serif text-2xl" style={{ color: 'var(--inv-text)' }}>
          {invitacion.estado === 'rechazado' ? 'Gracias por avisarnos' : '¡Gracias!'}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--inv-muted)' }}>
          {invitacion.estado === 'rechazado'
            ? 'Registramos que no van a poder acompanarnos.'
            : `Te esperamos: ${invitacion.pases_confirmados} ${
                invitacion.pases_confirmados === 1 ? 'persona confirmada' : 'personas confirmadas'
              }.`}
        </p>
        <button
          onClick={() => setEditando(true)}
          className="mt-4 text-xs underline underline-offset-4"
          style={{ color: 'var(--inv-primary)' }}
        >
          Modificar mi respuesta
        </button>
      </div>
    )
  }

  return (
    <div className={CAJA} style={{ borderColor: 'var(--inv-border)' }}>
      <p className="text-center text-sm" style={{ color: 'var(--inv-muted)' }}>
        {textoCupo(invitacion.modo_pases, invitacion.pases, delAdmin.length)}
      </p>

      <div className="mt-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => setAsiste(true)}
          className={cn(BOTON, asiste !== true && 'bg-white hover:bg-[var(--inv-hover)]')}
          style={
            asiste === true
              ? { backgroundColor: 'var(--inv-primary)', color: '#fff' }
              : { border: '1px solid var(--inv-border-strong)', color: 'var(--inv-text)' }
          }
        >
          <Check className="size-4" /> Si, alla estaremos
        </button>
        <button
          type="button"
          onClick={() => setAsiste(false)}
          className={cn(BOTON, asiste !== false && 'bg-white hover:bg-[var(--inv-hover)]')}
          style={
            asiste === false
              ? { backgroundColor: 'var(--inv-secondary)', color: '#fff' }
              : { border: '1px solid var(--inv-border-strong)', color: 'var(--inv-text)' }
          }
        >
          <X className="size-4" /> No podemos
        </button>
      </div>

      {asiste === true && nominal && (
        <fieldset className="mt-6">
          <legend
            className="mb-2 text-xs uppercase tracking-widest"
            style={{ color: 'var(--inv-muted)' }}
          >
            ¿Quienes van?
          </legend>
          <ul className="space-y-1.5">
            {delAdmin.map((i) => (
              <li key={i.id}>
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2.5 text-sm"
                  style={{ borderColor: 'var(--inv-border)', color: 'var(--inv-text)' }}
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    style={{ accentColor: 'var(--inv-primary)' }}
                    checked={Boolean(marcados[i.id])}
                    onChange={(e) =>
                      setMarcados((m) => ({ ...m, [i.id]: e.target.checked }))
                    }
                  />
                  <span>{i.nombre}</span>
                  {i.es_menor && (
                    <span className="text-xs" style={{ color: 'var(--inv-muted)' }}>
                      (menor)
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {asiste === true && !nominal && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: 'var(--inv-muted)' }}>
            ¿Cuantas personas asisten?
          </p>
          <CantidadSelector
            valor={cantidad}
            // En "abierto" sin tope va null: el invitado tiene que poder
            // escribir 14 si lleva a 14, sin que el selector le ponga un
            // limite que la regla no tiene.
            maximo={invitacion.modo_pases === 'cupo' ? (invitacion.pases ?? 1) : invitacion.pases}
            onChange={(n) => {
              setCantidad(n)
              setNombres((prev) => {
                const copia = prev.slice(0, n)
                while (copia.length < n) copia.push('')
                return copia
              })
            }}
          />

          <div className="mt-4 space-y-2">
            <p className="text-xs" style={{ color: 'var(--inv-muted)' }}>
              Nombres (opcional, nos ayuda a armar las mesas)
            </p>
            {Array.from({ length: cantidad }).map((_, i) => (
              <input
                key={i}
                value={nombres[i] ?? ''}
                onChange={(e) =>
                  setNombres((prev) => {
                    const copia = [...prev]
                    while (copia.length < cantidad) copia.push('')
                    copia[i] = e.target.value
                    return copia
                  })
                }
                placeholder={`Persona ${i + 1}`}
                className="campo-inv h-10 w-full rounded-md border bg-white px-3 text-sm outline-none"
                style={{ borderColor: 'var(--inv-border)', color: 'var(--inv-text)' }}
              />
            ))}
          </div>
        </div>
      )}

      {asiste !== null && (
        <div className="mt-5">
          <label
            className="mb-1.5 block text-xs uppercase tracking-widest"
            style={{ color: 'var(--inv-muted)' }}
          >
            Mensaje para los novios (opcional)
          </label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={3}
            maxLength={500}
            className="campo-inv w-full rounded-md border bg-white px-3 py-2 text-sm leading-relaxed outline-none"
            style={{ borderColor: 'var(--inv-border)', color: 'var(--inv-text)' }}
            placeholder="Alergias, si llevan a alguien mas, o simplemente unas palabras…"
          />
        </div>
      )}

      {error && (
        <p
          className="mt-4 rounded-md px-3 py-2 text-center text-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--inv-primary) 10%, transparent)',
            color: 'var(--inv-primary)',
          }}
        >
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={confirmar}
          disabled={asiste === null || enviando}
          className={cn(BOTON, 'px-10 text-white')}
          style={{ backgroundColor: 'var(--inv-primary-dark)' }}
        >
          {enviando ? <Loader2 className="size-4 animate-spin" /> : null}
          {enviando ? 'Enviando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}

/**
 * Botonera de 1..N cuando el cupo es chico (que es lo normal), y un input
 * numerico cuando es grande o no hay tope: veinte botones en un celular no
 * se tocan. `maximo` null = sin tope.
 */
function CantidadSelector({
  valor,
  maximo,
  onChange,
}: {
  valor: number
  maximo: number | null
  onChange: (n: number) => void
}) {
  if (maximo === null || maximo > 8) {
    return (
      <input
        type="number"
        min={1}
        max={maximo ?? undefined}
        value={valor}
        onChange={(e) => {
          const n = Number(e.target.value) || 1
          onChange(Math.max(1, maximo === null ? n : Math.min(maximo, n)))
        }}
        className="campo-inv h-11 w-24 rounded-md border bg-white px-3 text-center text-sm outline-none"
        style={{ borderColor: 'var(--inv-border)', color: 'var(--inv-text)' }}
      />
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: Math.max(maximo, 1) }).map((_, i) => {
        const n = i + 1
        const activo = n === valor
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn('size-11 rounded-full border text-sm transition-colors', !activo && 'bg-white hover:bg-[var(--inv-hover)]')}
            style={
              activo
                ? { borderColor: 'var(--inv-primary)', backgroundColor: 'var(--inv-primary)', color: '#fff' }
                : { borderColor: 'var(--inv-border-strong)', color: 'var(--inv-text)' }
            }
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}
