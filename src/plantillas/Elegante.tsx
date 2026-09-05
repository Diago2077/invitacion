import { CalendarPlus, MapPin } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { BotonMusica } from '@/components/publico/BotonMusica'
import { CuentaRegresiva } from '@/components/publico/CuentaRegresiva'
import { FormularioRsvp } from '@/components/publico/FormularioRsvp'
import { Galeria } from '@/components/publico/Galeria'
import { inicialesDe, Sobre } from '@/components/publico/Sobre'
import { useAparece } from '@/components/publico/useAparece'
import type { Acto, FamiliaPersona } from '@/lib/database.types'
import { formatFechaLarga, formatHora } from '@/lib/format'
import { descargarIcs } from '@/lib/ics'
import type { PropsPlantilla } from './tipos'

/**
 * Plantilla "Elegante": la que suma el sobre animado, musica de fondo,
 * familias, "nuestra historia" y galeria de fotos por encima de lo que ya
 * trae "Clasica" (cronograma, detalles, RSVP).
 *
 * Paleta propia (navy + marfil) fijada en `--inv-*` sobre el nodo raiz: los
 * componentes compartidos (CuentaRegresiva, FormularioRsvp) la toman de ahi,
 * asi que no hace falta tocarlos para sumar una plantilla con otro aspecto.
 */
const PALETA: CSSProperties = {
  '--inv-primary': '#1b2a4a',
  '--inv-primary-dark': '#12203a',
  '--inv-secondary': '#6b6055',
  '--inv-text': '#262a33',
  '--inv-muted': '#79736a',
  '--inv-border': '#e6ded0',
  '--inv-border-strong': '#cdbf9e',
  '--inv-hover': '#f4efe2',
  '--inv-placeholder': '#b6ab97',
} as CSSProperties

export default function Elegante({
  evento,
  invitacion,
  invitados,
  bloqueado,
  onConfirmado,
}: PropsPlantilla) {
  const ref = useAparece<HTMLDivElement>()
  const c = evento.contenido ?? {}
  const titulo = c.titulo?.trim() || evento.nombre
  const actos = (c.actos ?? []).filter((a) => a.titulo || a.lugar)
  const saludo = invitacion.saludo?.trim() || invitacion.nombre_grupo
  const monograma = useMemo(() => inicialesDe(titulo), [titulo])

  const [mostrarSobre, setMostrarSobre] = useState(true)
  const [sonando, setSonando] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)

  function alAbrirSobre() {
    // Tiene que llamarse DENTRO del click del sello: es el gesto que exige
    // el navegador para permitir reproducir audio sin que lo bloquee.
    audioRef.current?.play().catch(() => {
      // Algunos navegadores igual lo bloquean (ej. modo ahorro de datos).
      // La invitacion sigue andando igual, simplemente sin musica.
    })
  }

  function alternarMusica() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setSonando(!audio.muted)
  }

  return (
    <div
      ref={ref}
      className="min-h-screen bg-[#faf7f2] text-[#262a33]"
      style={PALETA}
    >
      {c.musica_url && <audio ref={audioRef} src={c.musica_url} loop preload="auto" />}

      {mostrarSobre && (
        <Sobre
          monograma={monograma}
          titulo={titulo}
          frase={c.frase}
          fechaLarga={formatFechaLarga(evento.fecha_evento)}
          onAbrir={alAbrirSobre}
          onCerrado={() => setMostrarSobre(false)}
        />
      )}

      {c.musica_url && !mostrarSobre && <BotonMusica sonando={sonando} onToggle={alternarMusica} />}

      {/* ── Portada ── */}
      <header className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        {c.imagen_portada ? (
          <>
            <img src={c.imagen_portada} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-[#1b2a4a]/45" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#eef0f5] to-[#faf7f2]" />
        )}

        <div className={'relative max-w-xl ' + (c.imagen_portada ? 'text-white' : 'text-[#262a33]')}>
          <Divisor tono={c.imagen_portada ? 'claro' : 'oscuro'} />
          {c.frase && (
            <p className="my-4 text-xs uppercase tracking-[0.4em] opacity-90">{c.frase}</p>
          )}
          <h1 className="font-serif text-6xl leading-none sm:text-7xl">{titulo}</h1>
          {evento.fecha_evento && (
            <p className="mt-5 text-sm uppercase tracking-[0.25em] opacity-90">
              {formatFechaLarga(evento.fecha_evento)}
            </p>
          )}
          <Divisor tono={c.imagen_portada ? 'claro' : 'oscuro'} className="mt-6" />
        </div>
      </header>

      {/* ── Saludo + cuenta regresiva ── */}
      <Seccion>
        <p className="text-center text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--inv-muted)' }}>
          {saludo}
        </p>
        {c.mensaje && (
          <p className="mx-auto mt-5 max-w-xl text-center font-serif text-xl italic leading-relaxed sm:text-2xl">
            {c.mensaje}
          </p>
        )}
        {evento.fecha_evento && (
          <div className="mt-8">
            <CuentaRegresiva fecha={evento.fecha_evento} />
          </div>
        )}
      </Seccion>

      {/* ── Familias ── */}
      {(c.familia_1 || c.familia_2) && (
        <Seccion titulo="Nuestras familias">
          <div className="grid gap-10 sm:grid-cols-2">
            {c.familia_1 && <BloqueFamilia persona={c.familia_1} />}
            {c.familia_2 && <BloqueFamilia persona={c.familia_2} />}
          </div>
        </Seccion>
      )}

      {/* ── Nuestra historia ── */}
      {c.historia && (
        <Seccion titulo="Nuestra historia">
          <p className="mx-auto max-w-xl text-center text-sm leading-relaxed sm:text-base">
            {c.historia}
          </p>
        </Seccion>
      )}

      {/* ── Galeria ── */}
      {c.galeria && c.galeria.length > 0 && (
        <Seccion titulo="Momentos">
          <Galeria fotos={c.galeria} />
        </Seccion>
      )}

      {/* ── Actos ── */}
      {actos.length > 0 && (
        <Seccion titulo="Cuando y donde">
          <div className="grid gap-4 sm:grid-cols-2">
            {actos.map((acto, i) => (
              <TarjetaActo key={acto.id || i} acto={acto} />
            ))}
          </div>
          {evento.fecha_evento && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  descargarIcs({
                    titulo,
                    inicio: evento.fecha_evento as string,
                    lugar: actos[0]?.lugar || undefined,
                    descripcion: c.mensaje,
                  })
                }
                className="inline-flex items-center gap-2 rounded-full border bg-white px-5 py-2.5 text-xs uppercase tracking-widest transition-colors hover:bg-[var(--inv-hover)]"
                style={{ borderColor: 'var(--inv-border-strong)', color: 'var(--inv-primary)' }}
              >
                <CalendarPlus className="size-4" /> Agendar
              </button>
            </div>
          )}
        </Seccion>
      )}

      {/* ── Detalles ── */}
      {(c.dress_code || c.regalos || c.notas) && (
        <Seccion titulo="Detalles">
          <div className="grid gap-4 sm:grid-cols-2">
            {c.dress_code && <Detalle titulo="Dress code">{c.dress_code}</Detalle>}
            {c.regalos && <Detalle titulo="Regalos">{c.regalos}</Detalle>}
            {c.notas && (
              <div className="sm:col-span-2">
                <Detalle titulo="Para tener en cuenta">{c.notas}</Detalle>
              </div>
            )}
          </div>
        </Seccion>
      )}

      {/* ── Confirmacion ── */}
      <Seccion titulo="Confirmá tu asistencia" id="confirmar">
        <div className="mx-auto max-w-lg">
          <FormularioRsvp
            invitacion={invitacion}
            invitados={invitados}
            bloqueado={bloqueado}
            onConfirmado={onConfirmado}
          />
        </div>
      </Seccion>

      <footer className="px-6 pb-14 pt-4 text-center">
        {c.hashtag && (
          <p className="font-serif text-xl" style={{ color: 'var(--inv-primary)' }}>
            {c.hashtag.startsWith('#') ? c.hashtag : `#${c.hashtag}`}
          </p>
        )}
        {c.contacto_nombre && (
          <p className="mt-3 text-xs" style={{ color: 'var(--inv-muted)' }}>
            Dudas: {c.contacto_nombre}
            {c.contacto_telefono && ` · ${c.contacto_telefono}`}
          </p>
        )}
      </footer>
    </div>
  )
}

function Divisor({ tono, className = '' }: { tono: 'claro' | 'oscuro'; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <span
        className={'h-px w-10 ' + (tono === 'claro' ? 'bg-white/60' : '')}
        style={tono === 'oscuro' ? { backgroundColor: 'var(--inv-border-strong)' } : undefined}
      />
      <span className="text-sm">❦</span>
      <span
        className={'h-px w-10 ' + (tono === 'claro' ? 'bg-white/60' : '')}
        style={tono === 'oscuro' ? { backgroundColor: 'var(--inv-border-strong)' } : undefined}
      />
    </div>
  )
}

function Seccion({ titulo, id, children }: { titulo?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="aparece px-6 py-14 sm:py-16">
      <div className="mx-auto max-w-2xl">
        {titulo && (
          <h2
            className="mb-8 text-center font-serif text-3xl"
            style={{ color: 'var(--inv-primary)' }}
          >
            {titulo}
          </h2>
        )}
        {children}
      </div>
    </section>
  )
}

function BloqueFamilia({ persona }: { persona: FamiliaPersona }) {
  return (
    <div className="text-center">
      <h3 className="font-serif text-2xl" style={{ color: 'var(--inv-text)' }}>
        {persona.nombre}
      </h3>
      {persona.padres && (
        <>
          <p className="mt-3 text-[11px] uppercase tracking-widest" style={{ color: 'var(--inv-muted)' }}>
            Hijo/a de
          </p>
          <p className="text-sm" style={{ color: 'var(--inv-text)' }}>
            {persona.padres}
          </p>
        </>
      )}
      {persona.hermanos && (
        <>
          <p className="mt-3 text-[11px] uppercase tracking-widest" style={{ color: 'var(--inv-muted)' }}>
            Hermano/a de
          </p>
          <p className="text-sm" style={{ color: 'var(--inv-text)' }}>
            {persona.hermanos}
          </p>
        </>
      )}
    </div>
  )
}

function TarjetaActo({ acto }: { acto: Acto }) {
  // Si no cargaron el link de Maps, se arma una busqueda con la direccion:
  // peor que el link exacto, mucho mejor que no tener nada.
  const destino =
    acto.maps_url?.trim() ||
    (acto.direccion
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${acto.lugar} ${acto.direccion}`.trim(),
        )}`
      : null)

  return (
    <div className="rounded-lg border bg-white/70 p-5 text-center" style={{ borderColor: 'var(--inv-border)' }}>
      <h3 className="font-serif text-2xl" style={{ color: 'var(--inv-text)' }}>
        {acto.titulo}
      </h3>
      {acto.fecha && (
        <p className="mt-1 text-sm" style={{ color: 'var(--inv-muted)' }}>
          {formatFechaLarga(acto.fecha)} · {formatHora(acto.fecha)}
        </p>
      )}
      {acto.lugar && (
        <p className="mt-3 text-sm font-medium" style={{ color: 'var(--inv-text)' }}>
          {acto.lugar}
        </p>
      )}
      {acto.direccion && (
        <p className="text-sm" style={{ color: 'var(--inv-muted)' }}>
          {acto.direccion}
        </p>
      )}
      {acto.cita && (
        <p className="mt-3 text-xs italic leading-relaxed" style={{ color: 'var(--inv-muted)' }}>
          “{acto.cita}”
        </p>
      )}
      {destino && (
        <a
          href={destino}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition-colors hover:bg-[var(--inv-hover)]"
          style={{ borderColor: 'var(--inv-border-strong)', color: 'var(--inv-primary)' }}
        >
          <MapPin className="size-3.5" /> Como llegar
        </a>
      )}
    </div>
  )
}

function Detalle({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-white/70 p-5" style={{ borderColor: 'var(--inv-border)' }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--inv-muted)' }}>
        {titulo}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--inv-text)' }}>
        {children}
      </p>
    </div>
  )
}
