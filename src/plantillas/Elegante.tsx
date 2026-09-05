import { CalendarPlus, MapPin } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { BotonMusica } from '@/components/publico/BotonMusica'
import { CuentaRegresiva } from '@/components/publico/CuentaRegresiva'
import { FormularioRsvp } from '@/components/publico/FormularioRsvp'
import { Galeria } from '@/components/publico/Galeria'
import { inicialesDe, Sobre } from '@/components/publico/Sobre'
import {
  Floritura,
  Hexagono,
  IconoAnillos,
  IconoBrindis,
  IconoVestimenta,
  RamoEsquina,
} from '@/components/publico/ornamentos'
import { useAparece } from '@/components/publico/useAparece'
import type { Acto, FamiliaPersona } from '@/lib/database.types'
import { formatFechaLarga, formatHora, normalizar } from '@/lib/format'
import { descargarIcs } from '@/lib/ics'
import type { PropsPlantilla } from './tipos'

/**
 * Plantilla "Elegante": sobre animado en 3D, musica de fondo, y el resto de
 * la invitacion con la estetica de flores secas y dorado.
 *
 * Paleta propia fijada en `--inv-*` sobre el nodo raiz: los componentes
 * compartidos (CuentaRegresiva, FormularioRsvp) la toman de ahi, asi que no
 * hace falta tocarlos para sumar una plantilla con otro aspecto.
 */
const PALETA: CSSProperties = {
  '--inv-primary': '#8a6a45',
  '--inv-primary-dark': '#6f5537',
  '--inv-secondary': '#7d7268',
  '--inv-text': '#4a4038',
  '--inv-muted': '#8a7d70',
  '--inv-border': '#e8ddcc',
  '--inv-border-strong': '#d5c3a5',
  '--inv-hover': '#faf5ec',
  '--inv-placeholder': '#b9ac9a',
} as CSSProperties

const DORADO = '#c8a165'

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
    // Tiene que llamarse DENTRO del click del lacre: es el gesto que exige
    // el navegador para permitir reproducir audio sin que lo bloquee.
    audioRef.current?.play().catch(() => {
      // Algunos navegadores igual lo bloquean (ej. modo ahorro de datos).
      // La invitacion sigue andando, simplemente sin musica.
    })
  }

  function alternarMusica() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setSonando(!audio.muted)
  }

  return (
    <div ref={ref} className="min-h-screen overflow-hidden bg-[#fdfbf7] text-[#4a4038]" style={PALETA}>
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
            <div className="absolute inset-0 bg-gradient-to-b from-[#3a2f24]/45 via-[#3a2f24]/35 to-[#3a2f24]/55" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#f6ece0] via-[#fdfbf7] to-[#f7f1e6]" />
            <RamoEsquina className="pointer-events-none absolute -left-8 -top-4 size-52 sm:size-72" opacidad={0.75} />
            <RamoEsquina
              className="pointer-events-none absolute -bottom-4 -right-8 size-52 sm:size-72"
              espejado
              opacidad={0.75}
            />
          </>
        )}

        <div className={'relative ' + (c.imagen_portada ? 'text-white' : '')}>
          {c.frase && (
            <p className="mb-5 text-[10px] uppercase tracking-[0.45em] opacity-90 sm:text-xs">
              {c.frase}
            </p>
          )}

          {/* Monograma encuadrado en el hexagono dorado */}
          <div className="relative mx-auto mb-6 flex size-28 items-center justify-center sm:size-32">
            <Hexagono
              className="absolute inset-0 size-full"
              color={c.imagen_portada ? 'rgba(255,255,255,0.8)' : DORADO}
            />
            <span
              className="whitespace-nowrap font-script text-3xl leading-none sm:text-4xl"
              style={{ color: c.imagen_portada ? '#fff' : '#a8804f' }}
            >
              {monograma}
            </span>
          </div>

          <TituloApilado titulo={titulo} />

          <Floritura
            className="my-5"
            ancho={190}
            color={c.imagen_portada ? 'rgba(255,255,255,0.85)' : DORADO}
          />

          {evento.fecha_evento && (
            <p className="text-[11px] uppercase tracking-[0.3em] opacity-95 sm:text-xs">
              {formatFechaLarga(evento.fecha_evento)}
            </p>
          )}
        </div>

        <a
          href="#confirmar"
          className={
            'absolute bottom-8 whitespace-nowrap rounded-full border px-6 py-2.5 text-[10px] uppercase tracking-[0.25em] transition-colors ' +
            (c.imagen_portada
              ? 'border-white/60 text-white hover:bg-white/15'
              : 'border-[#d5c3a5] text-[#8a6a45] hover:bg-[#f7f1e6]')
          }
        >
          Confirmar asistencia
        </a>
      </header>

      {/* ── Saludo + cuenta regresiva ── */}
      <Seccion>
        <p className="text-center text-[10px] uppercase tracking-[0.35em] text-[#a08f7c]">{saludo}</p>
        {c.mensaje && (
          <p className="mx-auto mt-6 max-w-xl text-center font-serif text-xl leading-relaxed text-[#5c5147] sm:text-2xl">
            {c.mensaje}
          </p>
        )}
        {evento.fecha_evento && (
          <div className="mt-10">
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
        <Seccion titulo="Nuestra historia" fondo>
          <p className="mx-auto max-w-xl text-center font-serif text-lg italic leading-relaxed text-[#5c5147]">
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
        <Seccion titulo="Cuando y donde" fondo>
          <div className="grid gap-5 sm:grid-cols-2">
            {actos.map((acto, i) => (
              <TarjetaActo key={acto.id || i} acto={acto} />
            ))}
          </div>
          {evento.fecha_evento && (
            <div className="mt-8 flex justify-center">
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
                className="inline-flex items-center gap-2 rounded-full border border-[#d5c3a5] bg-white px-6 py-2.5 text-[10px] uppercase tracking-[0.25em] text-[#8a6a45] transition-colors hover:bg-[#faf5ec]"
              >
                <CalendarPlus className="size-3.5" /> Agendar
              </button>
            </div>
          )}
        </Seccion>
      )}

      {/* ── Detalles ── */}
      {(c.dress_code || c.regalos || c.notas) && (
        <Seccion titulo="Detalles">
          <div className="space-y-5">
            {c.dress_code && (
              <Detalle titulo="Dress code" icono={<IconoVestimenta className="mx-auto h-16 w-20" />}>
                {c.dress_code}
              </Detalle>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {c.regalos && <Detalle titulo="Regalos">{c.regalos}</Detalle>}
              {c.notas && <Detalle titulo="Para tener en cuenta">{c.notas}</Detalle>}
            </div>
          </div>
        </Seccion>
      )}

      {/* ── Confirmacion ── */}
      <Seccion titulo="Confirmá tu asistencia" id="confirmar" fondo>
        <div className="mx-auto max-w-lg">
          <FormularioRsvp
            invitacion={invitacion}
            invitados={invitados}
            bloqueado={bloqueado}
            onConfirmado={onConfirmado}
          />
        </div>
      </Seccion>

      <footer className="relative overflow-hidden px-6 pb-16 pt-6 text-center">
        <RamoEsquina className="pointer-events-none absolute -bottom-8 -left-10 size-40" opacidad={0.5} />
        <RamoEsquina
          className="pointer-events-none absolute -bottom-8 -right-10 size-40"
          espejado
          opacidad={0.5}
        />
        <div className="relative">
          <Floritura ancho={150} />
          {c.hashtag && (
            <p className="mt-4 font-script text-3xl text-[#a8804f]">
              {c.hashtag.startsWith('#') ? c.hashtag : `#${c.hashtag}`}
            </p>
          )}
          {c.contacto_nombre && (
            <p className="mt-3 text-xs text-[#a08f7c]">
              Dudas: {c.contacto_nombre}
              {c.contacto_telefono && ` · ${c.contacto_telefono}`}
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}

/**
 * 'Valentina & Mateo' se muestra en tres renglones, con el '&' solo en el
 * del medio: es como se arma en una invitacion impresa, y ademas evita que
 * un nombre largo corte justo despues del '&' en una pantalla angosta.
 */
function TituloApilado({ titulo }: { titulo: string }) {
  const partes = titulo
    .split(/\s*(?:&|\+|\by\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean)

  if (partes.length < 2) {
    return <h1 className="font-script text-6xl leading-[1.05] sm:text-7xl">{titulo}</h1>
  }

  return (
    <h1 className="font-script leading-[0.95]">
      <span className="block text-6xl sm:text-7xl">{partes[0]}</span>
      <span className="my-1 block text-4xl opacity-70 sm:text-5xl">&amp;</span>
      <span className="block text-6xl sm:text-7xl">{partes.slice(1).join(' ')}</span>
    </h1>
  )
}

function Seccion({
  titulo,
  id,
  fondo,
  children,
}: {
  titulo?: string
  id?: string
  /** Franja crema, para alternar con el fondo blanco y separar secciones. */
  fondo?: boolean
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={'aparece px-6 py-16 sm:py-20 ' + (fondo ? 'bg-[#f9f4ea]' : '')}
    >
      <div className="mx-auto max-w-2xl">
        {titulo && (
          <div className="mb-10 text-center">
            <h2 className="font-script text-4xl text-[#a8804f] sm:text-5xl">{titulo}</h2>
            <Floritura className="mt-3" ancho={160} />
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function BloqueFamilia({ persona }: { persona: FamiliaPersona }) {
  return (
    <div className="text-center">
      <h3 className="font-script text-3xl text-[#4a4038]">{persona.nombre}</h3>
      <Floritura className="my-3" ancho={110} />
      {persona.padres && (
        <>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#a08f7c]">Hijo/a de</p>
          <p className="mt-1 font-serif text-lg text-[#5c5147]">{persona.padres}</p>
        </>
      )}
      {persona.hermanos && (
        <>
          <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-[#a08f7c]">Hermano/a de</p>
          <p className="mt-1 font-serif text-lg text-[#5c5147]">{persona.hermanos}</p>
        </>
      )}
    </div>
  )
}

/** Anillos para la ceremonia, copas para la fiesta: se elige por el titulo. */
function iconoDeActo(titulo: string) {
  const t = normalizar(titulo)
  if (t.includes('fiesta') || t.includes('recepcion') || t.includes('brindis')) {
    return <IconoBrindis className="mx-auto h-9 w-14" />
  }
  return <IconoAnillos className="mx-auto h-9 w-14" />
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
    <div className="rounded-lg border border-[#e8ddcc] bg-white p-6 text-center shadow-[0_10px_30px_-24px_rgba(90,70,45,0.6)]">
      {iconoDeActo(acto.titulo)}
      <h3 className="mt-3 font-script text-3xl text-[#4a4038]">{acto.titulo}</h3>
      {acto.fecha && (
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#a08f7c]">
          {formatFechaLarga(acto.fecha)} · {formatHora(acto.fecha)}
        </p>
      )}
      <Floritura className="my-4" ancho={100} />
      {acto.lugar && <p className="font-serif text-lg text-[#4a4038]">{acto.lugar}</p>}
      {acto.direccion && <p className="mt-1 text-sm text-[#8a7d70]">{acto.direccion}</p>}
      {acto.cita && (
        <p className="mt-4 font-serif text-sm italic leading-relaxed text-[#a08f7c]">“{acto.cita}”</p>
      )}
      {destino && (
        <a
          href={destino}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#d5c3a5] px-5 py-2 text-[10px] uppercase tracking-[0.25em] text-[#8a6a45] transition-colors hover:bg-[#faf5ec]"
        >
          <MapPin className="size-3.5" /> Como llegar
        </a>
      )}
    </div>
  )
}

function Detalle({
  titulo,
  icono,
  children,
}: {
  titulo: string
  icono?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#e8ddcc] bg-white p-6 text-center">
      {icono}
      <p className={'text-[10px] uppercase tracking-[0.28em] text-[#a08f7c] ' + (icono ? 'mt-3' : '')}>
        {titulo}
      </p>
      <p className="mt-2 whitespace-pre-line font-serif text-lg leading-relaxed text-[#4a4038]">
        {children}
      </p>
    </div>
  )
}
