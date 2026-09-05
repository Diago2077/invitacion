import { useEffect, useState } from 'react'

function restante(hasta: number) {
  const ms = Math.max(hasta - Date.now(), 0)
  return {
    dias: Math.floor(ms / 86400000),
    horas: Math.floor((ms / 3600000) % 24),
    minutos: Math.floor((ms / 60000) % 60),
    segundos: Math.floor((ms / 1000) % 60),
    terminado: ms === 0,
  }
}

/**
 * Cuenta regresiva hasta el evento. Se apaga sola cuando llega a cero en vez
 * de seguir contando en negativo.
 */
export function CuentaRegresiva({ fecha }: { fecha: string }) {
  const hasta = new Date(fecha).getTime()
  const [t, setT] = useState(() => restante(hasta))

  useEffect(() => {
    if (Number.isNaN(hasta)) return
    const id = setInterval(() => setT(restante(hasta)), 1000)
    return () => clearInterval(id)
  }, [hasta])

  if (Number.isNaN(hasta)) return null

  if (t.terminado) {
    return <p className="text-center font-serif text-2xl italic text-[#8a3b4a]">¡Llego el dia!</p>
  }

  const bloques = [
    { valor: t.dias, label: t.dias === 1 ? 'dia' : 'dias' },
    { valor: t.horas, label: 'hs' },
    { valor: t.minutos, label: 'min' },
    { valor: t.segundos, label: 'seg' },
  ]

  return (
    <div className="flex justify-center gap-3 sm:gap-5">
      {bloques.map((b) => (
        <div
          key={b.label}
          className="min-w-16 rounded-lg border border-[#e6d8d2] bg-white/70 px-3 py-2.5 text-center sm:min-w-20"
        >
          <p className="tabular font-serif text-2xl leading-none text-[#8a3b4a] sm:text-3xl">
            {String(b.valor).padStart(2, '0')}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-[#8c7a74]">{b.label}</p>
        </div>
      ))}
    </div>
  )
}
