import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

/** Carrusel simple de fotos, para la seccion de galeria de una plantilla. */
export function Galeria({ fotos }: { fotos: string[] }) {
  const [i, setI] = useState(0)
  if (fotos.length === 0) return null

  const anterior = () => setI((n) => (n - 1 + fotos.length) % fotos.length)
  const siguiente = () => setI((n) => (n + 1) % fotos.length)

  return (
    <div className="mx-auto max-w-md">
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--inv-border)' }}
      >
        <img key={i} src={fotos[i]} alt="" className="size-full object-cover" />

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={siguiente}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {fotos.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Ir a la foto ${idx + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: idx === i ? '1.1rem' : '0.375rem',
                backgroundColor: idx === i ? 'var(--inv-primary)' : 'var(--inv-border-strong)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
