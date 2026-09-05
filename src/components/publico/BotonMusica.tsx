import { Volume2, VolumeX } from 'lucide-react'

/**
 * Boton flotante para silenciar/reactivar la musica de fondo.
 *
 * El audio arranca solo (ver Sobre: onAbrir dispara audio.play() dentro del
 * mismo click del sello, que es el gesto que los navegadores exigen para
 * permitir el autoplay), asi que este boton no inicia la reproduccion --
 * solo alterna `muted`, que es instantaneo y no pelea con el estado interno
 * del <audio> (loop, posicion) como si hiciera play/pause.
 */
export function BotonMusica({
  sonando,
  onToggle,
}: {
  sonando: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={sonando ? 'Silenciar musica' : 'Activar musica'}
      className="fixed bottom-5 right-5 z-40 flex size-11 items-center justify-center rounded-full text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
      style={{ backgroundColor: 'color-mix(in srgb, var(--inv-primary) 88%, black)' }}
    >
      {sonando ? <Volume2 className="size-4.5" /> : <VolumeX className="size-4.5" />}
    </button>
  )
}
