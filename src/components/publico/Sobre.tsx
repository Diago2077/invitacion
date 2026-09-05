import { useEffect, useMemo, useState } from 'react'
import { Floritura, Hexagono, RamoEsquina } from './ornamentos'

/**
 * Portada tipo sobre, con apertura en 3D.
 *
 * La secuencia imita la de un sobre real y por eso son cuatro fases y no
 * una sola animacion: primero se rompe el lacre, despues la solapa gira
 * hacia atras sobre su borde superior, recien ahi la tarjeta sale del
 * bolsillo, y al final todo se desvanece para dejar ver la invitacion.
 *
 * El apilado es 3D de verdad (perspective + preserve-3d + translateZ), no
 * z-index: eso es lo que hace que la tarjeta salga POR DETRAS del bolsillo
 * y por delante del dorso, como en un sobre de papel.
 *
 *   z=0  dorso (interior del sobre)
 *   z=1  tarjeta            <- sale deslizandose hacia arriba
 *   z=2  bolsillo delantero <- tapa la tarjeta hasta que asoma por la V
 *   z=3  solapa             <- gira -170deg sobre su borde de arriba
 *   z=4  lacre              <- el boton
 */
type Fase = 'cerrado' | 'abriendo' | 'saliendo' | 'fuera'

/** Cada paso arranca donde el anterior ya se ve encaminado, no cuando termina. */
const TIEMPOS = { solapa: 900, tarjeta: 1000, salida: 600 }

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

  // Posiciones y demoras de las particulas: fijas por montaje, no por
  // render, para que no salten cuando el componente se vuelve a dibujar.
  const particulas = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        izq: 8 + Math.random() * 84,
        abajo: Math.random() * 30,
        demora: Math.random() * 900,
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

    setFase('abriendo')
    setTimeout(() => setFase('saliendo'), TIEMPOS.solapa)
    setTimeout(() => setFase('fuera'), TIEMPOS.solapa + TIEMPOS.tarjeta)
    setTimeout(onCerrado, TIEMPOS.solapa + TIEMPOS.tarjeta + TIEMPOS.salida)
  }

  const abriendo = fase !== 'cerrado'
  const tarjetaAfuera = fase === 'saliendo' || fase === 'fuera'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-6"
      style={{
        background:
          'radial-gradient(ellipse at 50% 35%, #fffdf9 0%, #f7efe2 55%, #efe3d2 100%)',
        opacity: fase === 'fuera' ? 0 : 1,
        transform: fase === 'fuera' ? 'scale(1.06)' : 'none',
        transition: `opacity ${TIEMPOS.salida}ms ease-out, transform ${TIEMPOS.salida}ms ease-out`,
        pointerEvents: fase === 'fuera' ? 'none' : 'auto',
      }}
    >
      {/* Ramos en las esquinas, como en las invitaciones impresas */}
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
          <div
            className="relative mx-auto aspect-[4/5] w-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Dorso: el interior del sobre */}
            <div
              className="absolute inset-0 rounded-[3px]"
              style={{
                background: 'linear-gradient(170deg, #f3e9d8, #e7d9c2)',
                transform: 'translateZ(0)',
                boxShadow: '0 30px 60px -25px rgba(90,70,45,0.45)',
              }}
            />

            {/* Tarjeta: sale deslizandose por la V */}
            <div
              className="absolute left-1/2 flex flex-col items-center justify-center rounded-[2px] bg-[#fffdf8] px-5 text-center"
              style={{
                width: '86%',
                height: '88%',
                bottom: '6%',
                transform: `translateX(-50%) translateZ(1px) translateY(${tarjetaAfuera ? '-62%' : '0%'}) scale(${tarjetaAfuera ? 1.03 : 1})`,
                transition: `transform ${TIEMPOS.tarjeta}ms cubic-bezier(0.22, 0.9, 0.3, 1)`,
                boxShadow: tarjetaAfuera ? '0 24px 40px -18px rgba(90,70,45,0.5)' : 'none',
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
                <p className="mt-2 text-[9px] uppercase tracking-[0.28em] text-[#9a8a76]">
                  {fechaLarga}
                </p>
              )}
            </div>

            {/* Bolsillo delantero, con la V que copia la solapa */}
            <div
              className="absolute inset-0 rounded-[3px]"
              style={{
                background: 'linear-gradient(185deg, #fdf7ec, #f2e6d2)',
                clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)',
                transform: 'translateZ(2px)',
              }}
            />
            {/* Los dos pliegues del bolsillo, apenas marcados */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                transform: 'translateZ(2.1px)',
                clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)',
                background:
                  'linear-gradient(to bottom right, transparent calc(50% - 0.5px), rgba(160,130,90,0.18) 50%, transparent calc(50% + 0.5px)), linear-gradient(to bottom left, transparent calc(50% - 0.5px), rgba(160,130,90,0.18) 50%, transparent calc(50% + 0.5px))',
              }}
            />

            {/* Solapa: gira sobre su borde de arriba */}
            <div
              className="absolute inset-x-0 top-0"
              style={{
                height: '55%',
                background: abriendo
                  ? 'linear-gradient(0deg, #f0e4cf, #e6d7bd)'
                  : 'linear-gradient(175deg, #fdf7ec, #efe2cb)',
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                transformOrigin: 'top center',
                transform: `translateZ(3px) rotateX(${abriendo ? -172 : 0}deg)`,
                transition: `transform ${TIEMPOS.solapa}ms cubic-bezier(0.5, 0, 0.35, 1), background 300ms linear`,
                filter: abriendo ? 'brightness(0.97)' : 'none',
              }}
            />

            {/* Lacre = boton de abrir */}
            <button
              type="button"
              onClick={tocar}
              aria-label="Abrir invitacion"
              disabled={abriendo}
              className="absolute left-1/2 flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
              style={{
                top: '55%',
                transform: `translate(-50%, -50%) translateZ(4px) scale(${abriendo ? 1.5 : 1}) rotate(${abriendo ? 14 : 0}deg)`,
                opacity: abriendo ? 0 : 1,
                transition: 'transform 420ms ease-out, opacity 380ms ease-out',
                background:
                  'radial-gradient(circle at 34% 28%, #c8a165 0%, #a8804f 45%, #8a6a45 100%)',
                boxShadow: '0 6px 14px -4px rgba(90,70,45,0.6), inset 0 1px 2px rgba(255,255,255,0.4)',
              }}
            >
              <span className="whitespace-nowrap font-script text-lg leading-none">{monograma}</span>
            </button>

            {/* Particulas doradas, solo mientras se abre */}
            {abriendo &&
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
          style={{ opacity: abriendo ? 0 : undefined, transition: 'opacity 300ms' }}
        >
          Toca el sello para abrir
        </p>
        {frase && !abriendo && (
          <p className="mt-1 font-serif text-sm italic text-[#9a8a76]">{frase}</p>
        )}
      </div>
    </div>
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
