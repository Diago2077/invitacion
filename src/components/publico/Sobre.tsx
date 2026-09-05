import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Floritura, Hexagono, RamoEsquina } from './ornamentos'

/**
 * Portada tipo sobre, con apertura en 3D en cuatro tiempos (igual que un
 * sobre de regalo real):
 *
 *   1. rompiendo -> el lacre se rompe (un "pop" con destello, no un fade).
 *   2. abriendo  -> la solapa gira hacia atras sobre su borde de arriba.
 *   3. cortina   -> el moño se desata y dos cortinas de tela se corren a
 *                   los costados, revelando la tarjeta que ya estaba ahi.
 *   4. fuera     -> todo el conjunto se desvanece y aparece la invitacion.
 *
 * El apilado es 3D de verdad (perspective + preserve-3d + translateZ), no
 * z-index: por eso la solapa puede girar "hacia atras" de verdad en vez de
 * solo cambiar de tamano.
 *
 *   z=0  dorso (papel base, con grano)
 *   z=1  tarjeta (el contenido: monograma, titulo, fecha)
 *   z=2  cortinas (tela que tapa la tarjeta hasta que se corre)
 *   z=3  moño (se desata primero, antes de que corran las cortinas)
 *   z=4  solapa (tapa todo lo de arriba hasta que se abre)
 *   z=5  lacre (el boton; se rompe primero que nada)
 */
type Fase = 'cerrado' | 'rompiendo' | 'abriendo' | 'cortina' | 'fuera'

/** Cada paso arranca un poco antes de que el anterior termine del todo. */
const TIEMPOS = { romper: 320, solapa: 760, cortina: 680, salida: 550 }

/**
 * Grano de papel: una textura de ruido generada en SVG (feTurbulence), no
 * una foto. No queda tan realista como un papel fotografiado, pero rompe la
 * planitud de un gradiente CSS puro sin depender de un asset por plantilla.
 */
const RUIDO_PAPEL = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140">' +
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 0 0.5 0 0 0 0 0.42 0 0 0 0 0.3 0 0 0 0.07 0"/></filter>' +
    '<rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`

function papel(gradiente: string): CSSProperties {
  return {
    backgroundImage: `${RUIDO_PAPEL}, ${gradiente}`,
    backgroundSize: '140px 140px, cover',
    backgroundBlendMode: 'overlay, normal',
  }
}

export function Sobre({
  monograma,
  titulo,
  frase,
  fechaLarga,
  onAbrir,
  onCerrado,
}: {
  monograma: string
  titulo: string
  frase?: string
  fechaLarga?: string
  onAbrir: () => void
  onCerrado: () => void
}) {
  const [fase, setFase] = useState<Fase>('cerrado')

  // El sobre actua como un modal: mientras esta, no se scrollea lo de atras.
  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [])

  const particulas = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        izq: 6 + Math.random() * 88,
        abajo: Math.random() * 35,
        demora: Math.random() * 1000,
        tam: 3 + Math.random() * 4,
      })),
    [],
  )

  function tocar() {
    if (fase !== 'cerrado') return
    // Tiene que salir DENTRO del click: es el gesto que exige el navegador
    // para dejar sonar el audio sin bloquearlo.
    onAbrir()

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (sinMovimiento) {
      setFase('fuera')
      setTimeout(onCerrado, 250)
      return
    }

    const { romper, solapa, cortina, salida } = TIEMPOS
    setFase('rompiendo')
    setTimeout(() => setFase('abriendo'), romper)
    setTimeout(() => setFase('cortina'), romper + solapa)
    setTimeout(() => setFase('fuera'), romper + solapa + cortina)
    setTimeout(onCerrado, romper + solapa + cortina + salida)
  }

  const selloRoto = fase !== 'cerrado'
  const flapAbierta = fase === 'abriendo' || fase === 'cortina' || fase === 'fuera'
  const cortinaAbierta = fase === 'cortina' || fase === 'fuera'
  const conParticulas = fase === 'abriendo' || fase === 'cortina'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-6"
      style={{
        background: 'radial-gradient(ellipse at 50% 35%, #fffdf9 0%, #f7efe2 55%, #efe3d2 100%)',
        opacity: fase === 'fuera' ? 0 : 1,
        transform: fase === 'fuera' ? 'scale(1.06)' : 'none',
        transition: `opacity ${TIEMPOS.salida}ms ease-out, transform ${TIEMPOS.salida}ms ease-out`,
        pointerEvents: fase === 'fuera' ? 'none' : 'auto',
      }}
    >
      <RamoEsquina className="pointer-events-none absolute -left-6 -top-6 size-44 sm:size-56" opacidad={0.7} />
      <RamoEsquina
        className="pointer-events-none absolute -bottom-6 -right-6 size-44 sm:size-56"
        espejado
        opacidad={0.7}
      />

      <div className="relative flex w-full max-w-[300px] flex-col items-center">
        <p className="mb-5 text-[10px] uppercase tracking-[0.4em]" style={{ color: '#9a8a76' }}>
          Estás invitado a
        </p>

        {/* ── Escena 3D ── */}
        <div className="relative w-full" style={{ perspective: '1400px' }}>
          <div className="relative mx-auto aspect-[4/5] w-full" style={{ transformStyle: 'preserve-3d' }}>
            {/* Dorso: el interior del sobre */}
            <div
              className="absolute inset-0 rounded-[3px]"
              style={{
                ...papel('linear-gradient(170deg, #f3e9d8, #e7d9c2)'),
                transform: 'translateZ(0)',
                boxShadow: '0 30px 60px -25px rgba(90,70,45,0.45)',
              }}
            />

            {/* Tarjeta: siempre en su lugar, la tapan las cortinas hasta que se corren */}
            <div
              className="absolute left-1/2 flex flex-col items-center justify-center overflow-hidden rounded-[2px] bg-[#fffdf8] px-5 text-center"
              style={{
                width: '86%',
                height: '88%',
                bottom: '6%',
                transform: 'translateX(-50%) translateZ(1px)',
              }}
            >
              <div className="relative flex size-[104px] items-center justify-center">
                <Hexagono className="absolute inset-0 size-full" />
                <span className="whitespace-nowrap font-script text-3xl leading-none text-[#a8804f]">
                  {monograma}
                </span>
              </div>
              <Floritura className="mt-3" ancho={130} />
              <p className="mt-3 font-script text-2xl leading-tight text-[#4a4038]">{titulo}</p>
              {fechaLarga && (
                <p className="mt-2 text-[9px] uppercase tracking-[0.28em] text-[#9a8a76]">{fechaLarga}</p>
              )}
            </div>

            {/* Cortinas: tapan la tarjeta hasta la fase "cortina" */}
            <div
              className="absolute left-1/2 overflow-hidden"
              style={{
                width: '86%',
                height: '88%',
                bottom: '6%',
                transform: 'translateX(-50%) translateZ(1.5px)',
              }}
            >
              <div
                className="absolute inset-y-0 left-0 w-1/2"
                style={{
                  background: 'linear-gradient(100deg, #f8efe0, #ecdcc0 88%)',
                  boxShadow: 'inset -6px 0 10px -6px rgba(120,95,60,0.35)',
                  transform: `translateX(${cortinaAbierta ? '-100%' : '0%'})`,
                  transition: `transform ${TIEMPOS.cortina}ms cubic-bezier(0.65, 0, 0.35, 1)`,
                }}
              />
              <div
                className="absolute inset-y-0 right-0 w-1/2"
                style={{
                  background: 'linear-gradient(260deg, #f8efe0, #ecdcc0 88%)',
                  boxShadow: 'inset 6px 0 10px -6px rgba(120,95,60,0.35)',
                  transform: `translateX(${cortinaAbierta ? '100%' : '0%'})`,
                  transition: `transform ${TIEMPOS.cortina}ms cubic-bezier(0.65, 0, 0.35, 1) 120ms`,
                }}
              />
            </div>

            {/* Moño: se desata antes de que corran las cortinas */}
            <div
              className="absolute left-1/2 flex flex-col items-center"
              style={{
                bottom: '46%',
                transform: 'translateX(-50%) translateZ(1.8px)',
              }}
            >
              <div
                className="flex items-center"
                style={{
                  opacity: cortinaAbierta ? 0 : 1,
                  transform: cortinaAbierta ? 'scale(0.4)' : 'scale(1)',
                  transition: 'opacity 420ms ease-in, transform 420ms cubic-bezier(0.4, 0, 1, 1)',
                }}
              >
                <LazoLado color="#efe3d0" borde="#c9a165" />
                <div
                  className="mx-[-3px] size-3.5 rounded-full"
                  style={{ background: 'radial-gradient(circle at 35% 30%, #f3e6cf, #c9a165)' }}
                />
                <LazoLado color="#efe3d0" borde="#c9a165" espejado />
              </div>
              {/* Colas del moño, cayendo sobre la costura de las cortinas */}
              <div
                className="flex gap-1"
                style={{
                  opacity: cortinaAbierta ? 0 : 1,
                  transform: cortinaAbierta ? 'translateY(30px)' : 'translateY(0)',
                  transition: 'opacity 380ms ease-in 60ms, transform 380ms ease-in 60ms',
                }}
              >
                <Cola color="#efe3d0" />
                <Cola color="#efe3d0" espejada />
              </div>
            </div>

            {/* Solapa: gira sobre su borde de arriba */}
            <div
              className="absolute inset-x-0 top-0"
              style={{
                height: '55%',
                ...papel(flapAbierta ? 'linear-gradient(0deg, #f0e4cf, #e6d7bd)' : 'linear-gradient(175deg, #fdf7ec, #efe2cb)'),
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                transformOrigin: 'top center',
                transform: `translateZ(3px) rotateX(${flapAbierta ? -172 : 0}deg)`,
                transition: `transform ${TIEMPOS.solapa}ms cubic-bezier(0.5, 0, 0.35, 1)`,
              }}
            />

            {/* Lacre = boton de abrir. Se "revienta" con un destello antes de desaparecer. */}
            <div
              className="absolute left-1/2 flex items-center justify-center"
              style={{ top: '55%', transform: 'translate(-50%, -50%) translateZ(4px)' }}
            >
              {selloRoto && (
                <span
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    inset: 0,
                    background: 'radial-gradient(circle, rgba(255,244,214,0.9), rgba(255,244,214,0) 70%)',
                    animation: 'destello-lacre 420ms ease-out forwards',
                  }}
                />
              )}
              <button
                type="button"
                onClick={tocar}
                aria-label="Abrir invitacion"
                disabled={selloRoto}
                className="relative flex size-16 items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
                style={{
                  borderRadius: '46% 54% 58% 42% / 48% 44% 56% 52%',
                  background:
                    'radial-gradient(circle at 32% 26%, #ddb679 0%, #b8863f 40%, #8a6027 78%, #6e4a1e 100%)',
                  boxShadow:
                    'inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -3px 7px rgba(0,0,0,0.35), 0 8px 16px -6px rgba(60,40,15,0.6)',
                  transform: selloRoto ? 'scale(0.35) rotate(28deg)' : 'scale(1) rotate(0deg)',
                  opacity: selloRoto ? 0 : 1,
                  transition: 'transform 340ms cubic-bezier(0.36, 0, 0.66, -0.4), opacity 300ms ease-in',
                }}
              >
                <span className="whitespace-nowrap font-script text-lg leading-none">{monograma}</span>
              </button>
            </div>

            {/* Particulas doradas, durante la apertura */}
            {conParticulas &&
              particulas.map((p) => (
                <span
                  key={p.id}
                  className="particula pointer-events-none absolute rounded-full"
                  style={{
                    left: `${p.izq}%`,
                    bottom: `${p.abajo}%`,
                    width: p.tam,
                    height: p.tam,
                    background: '#c8a165',
                    animationDelay: `${p.demora}ms`,
                    transform: 'translateZ(5px)',
                  }}
                />
              ))}
          </div>
        </div>

        <p
          className="respira mt-8 text-[11px] uppercase tracking-[0.3em] text-[#a8804f]"
          style={{ opacity: selloRoto ? 0 : undefined, transition: 'opacity 300ms' }}
        >
          Toca el sello para abrir
        </p>
        {frase && !selloRoto && <p className="mt-1 font-serif text-sm italic text-[#9a8a76]">{frase}</p>}
      </div>

      <style>{`
        @keyframes destello-lacre {
          0% { opacity: 0; transform: scale(0.5); }
          35% { opacity: 1; }
          100% { opacity: 0; transform: scale(2.4); }
        }
      `}</style>
    </div>
  )
}

/** Un lado del moño: un lazo asimetrico via border-radius, no una imagen. */
function LazoLado({
  color,
  borde,
  espejado = false,
}: {
  color: string
  borde: string
  espejado?: boolean
}) {
  return (
    <div
      className="h-6 w-8"
      style={{
        background: `linear-gradient(${espejado ? 135 : 45}deg, ${color}, ${borde})`,
        borderRadius: espejado ? '90% 10% 60% 40%' : '10% 90% 40% 60%',
        transform: `rotate(${espejado ? 8 : -8}deg)`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
      }}
    />
  )
}

/** Una cola del moño, con la V clasica en la punta. */
function Cola({ color, espejada = false }: { color: string; espejada?: boolean }) {
  return (
    <div
      className="h-7 w-2.5"
      style={{
        background: color,
        clipPath: espejada
          ? 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)'
          : 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
      }}
    />
  )
}

/**
 * 'Valentina & Mateo' -> 'V & M'. 'Cumpleanos de Sofia' -> 'S'.
 * Sirve para el monograma del sobre; no tiene que ser perfecto, solo
 * legible con dos letras.
 */
export function inicialesDe(nombre: string): string {
  const partes = nombre
    .split(/\s*(?:&|\+|\by\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean)

  if (partes.length >= 2) {
    const [a, b] = partes
    return `${a[0]?.toUpperCase() ?? ''} & ${b[0]?.toUpperCase() ?? ''}`
  }
  return nombre.trim()[0]?.toUpperCase() ?? '♥'
}
