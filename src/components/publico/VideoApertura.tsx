import { SkipForward } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const DURACION_FUNDIDO = 550

/**
 * Portada en video: se reproduce una vez y se desvanece hacia el contenido.
 *
 * Reemplaza al <Sobre> en CSS cuando el evento tiene un video de apertura
 * cargado (ver ContenidoTab). El video lo genera el admin por fuera (Veo,
 * Gemini, un editor, lo que sea) con los nombres de la pareja ya
 * incrustados -- esto solo lo reproduce y arma la transicion.
 *
 * Arranca con un boton "Toca para comenzar" y no en automatico: es el gesto
 * que los navegadores exigen para dejar sonar audio sin bloquearlo -- el
 * video en si normalmente no trae sonido (lo genera una IA de video), pero
 * la musica de fondo del evento si, y usa este mismo toque para arrancar.
 */
export function VideoApertura({
  src,
  onAbrir,
  onFin,
}: {
  src: string
  /** Se llama en el mismo click que arranca el video (arranca ahi la musica de fondo, si hay). */
  onAbrir?: () => void
  onFin: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [desvaneciendo, setDesvaneciendo] = useState(false)

  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [])

  function terminar() {
    if (desvaneciendo) return
    setDesvaneciendo(true)
    videoRef.current?.pause()
    setTimeout(onFin, DURACION_FUNDIDO)
  }

  function tocar() {
    if (reproduciendo) return
    setReproduciendo(true)
    onAbrir?.()
    videoRef.current?.play().catch(() => {
      // Si el navegador igual lo bloquea, no dejamos al invitado trabado
      // mirando un video pausado: se pasa directo al contenido.
      terminar()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      style={{
        opacity: desvaneciendo ? 0 : 1,
        transition: `opacity ${DURACION_FUNDIDO}ms ease-out`,
        pointerEvents: desvaneciendo ? 'none' : 'auto',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        className="size-full object-cover"
        // Ante cualquier problema (formato no soportado, archivo roto,
        // conexion lenta que nunca carga) se pasa al contenido en vez de
        // dejar al invitado mirando una pantalla negra.
        onEnded={terminar}
        onError={terminar}
      />

      {!reproduciendo && (
        <button
          type="button"
          onClick={tocar}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 text-white"
        >
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-white/80">
            <span
              className="ml-1 border-y-[10px] border-l-[16px] border-y-transparent border-l-white"
              aria-hidden="true"
            />
          </span>
          <span className="text-xs uppercase tracking-[0.3em]">Toca para comenzar</span>
        </button>
      )}

      {reproduciendo && !desvaneciendo && (
        <button
          type="button"
          onClick={terminar}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] uppercase tracking-widest text-white backdrop-blur-sm"
        >
          Saltar <SkipForward className="size-3.5" />
        </button>
      )}
    </div>
  )
}
