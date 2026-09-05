import { useEffect, useState } from 'react'

/**
 * Portada tipo "sobre": tapa la invitacion hasta que el invitado toca para
 * abrir. Es el efecto que mas se nota de una invitacion "premium" y no
 * necesita ilustracion encargada: el sobre se dibuja entero con CSS
 * (gradientes + clip-path), asi que funciona igual para cualquier evento sin
 * depender de arte por pedido.
 *
 * El sello central ES el boton: al tocarlo se dispara `onAbrir` (para
 * arrancar la musica de fondo, si hay, DENTRO del mismo gesto de click --
 * los navegadores exigen eso para no bloquear el audio) y arranca la
 * animacion de apertura; recien cuando termina se llama a `onCerrado`, que
 * es lo que el padre usa para sacar el sobre del arbol y mostrar el resto.
 */
const DURACION_MS = 700

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
  const [cerrando, setCerrando] = useState(false)

  // El sobre actua como un modal: mientras esta, no se scrollea lo de atras.
  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [])

  function tocar() {
    if (cerrando) return
    onAbrir()
    setCerrando(true)
    setTimeout(onCerrado, DURACION_MS)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6 transition-all ease-in-out"
      style={{
        transitionDuration: `${DURACION_MS}ms`,
        opacity: cerrando ? 0 : 1,
        transform: cerrando ? 'scale(0.94) translateY(-12px)' : 'none',
        pointerEvents: cerrando ? 'none' : 'auto',
        // Fondo propio, fijo, independiente de la paleta de la plantilla: el
        // sobre tapa el header mientras carga, asi que no puede depender de
        // que la plantilla ya haya pintado su fondo.
        background:
          'radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--inv-primary) 10%, transparent), transparent 60%), #faf7f2',
      }}
    >
      <div className="flex w-full max-w-xs flex-col items-center">
        <p
          className="mb-6 text-[11px] uppercase tracking-[0.35em]"
          style={{ color: 'var(--inv-muted)' }}
        >
          Estás invitado a
        </p>

        {/* El sobre */}
        <div className="relative aspect-[4/5] w-full max-w-[260px] drop-shadow-xl">
          {/* Cuerpo */}
          <div
            className="absolute inset-0 rounded-[2px]"
            style={{ background: 'linear-gradient(180deg, #fffefb, #f7f1e4)' }}
          />
          {/* Solapa triangular, superior */}
          <div
            className="absolute inset-x-0 top-0 h-[58%]"
            style={{
              background: 'linear-gradient(160deg, #fbf6ea, #efe6d2)',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }}
          />
          {/* Linea del pliegue */}
          <div
            className="absolute inset-x-0 top-0 h-[58%] opacity-40"
            style={{
              background: 'linear-gradient(160deg, transparent 96%, var(--inv-border-strong) 100%)',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }}
          />

          {/* Monograma, arriba dentro de la solapa */}
          <div className="absolute inset-x-0 top-[12%] flex flex-col items-center">
            <div
              className="flex size-16 items-center justify-center rounded-full border"
              style={{ borderColor: 'var(--inv-border-strong)' }}
            >
              <span
                className="font-serif text-xl tracking-wide"
                style={{ color: 'var(--inv-primary)' }}
              >
                {monograma}
              </span>
            </div>
          </div>

          {/* Titulo y fecha, en el cuerpo, debajo de donde cierra la solapa */}
          <div className="absolute inset-x-0 bottom-[14%] flex flex-col items-center gap-1 px-4 text-center">
            <p className="font-serif text-lg leading-tight" style={{ color: 'var(--inv-text)' }}>
              {titulo}
            </p>
            {fechaLarga && (
              <p
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: 'var(--inv-muted)' }}
              >
                {fechaLarga}
              </p>
            )}
          </div>

          {/* Sello de cera = boton de abrir, apoyado justo en la punta de la solapa */}
          <button
            type="button"
            onClick={tocar}
            aria-label="Abrir invitacion"
            className="absolute left-1/2 top-[58%] flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, var(--inv-primary), var(--inv-primary-dark))',
            }}
          >
            <span className="font-serif text-base">{monograma}</span>
          </button>
        </div>

        <p
          className="mt-8 animate-pulse text-[11px] uppercase tracking-[0.3em]"
          style={{ color: 'var(--inv-primary)' }}
        >
          Toca para abrir
        </p>
        {frase && (
          <p className="mt-1 text-[11px] italic" style={{ color: 'var(--inv-muted)' }}>
            {frase}
          </p>
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
