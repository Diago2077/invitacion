import { useEffect, useRef } from 'react'

/**
 * Hace aparecer las secciones al llegar el scroll. El observer solo agrega
 * la clase .visible (ver index.css); si el visitante pidio menos movimiento,
 * el CSS ya deja todo visible y esto no cambia nada.
 *
 * Se observa una sola vez por elemento: una seccion que ya aparecio no
 * vuelve a desvanecerse al scrollear para arriba.
 */
export function useAparece<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const nodos = ref.current?.querySelectorAll('.aparece')
    if (!nodos || nodos.length === 0) return

    const observer = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visible')
            observer.unobserve(entrada.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )

    nodos.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [])

  return ref
}
