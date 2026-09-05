import { CalendarPlus, Gift, MapPin, Shirt } from 'lucide-react'
import type { ReactNode } from 'react'
import { CuentaRegresiva } from '@/components/publico/CuentaRegresiva'
import { FormularioRsvp } from '@/components/publico/FormularioRsvp'
import { useAparece } from '@/components/publico/useAparece'
import type { Acto } from '@/lib/database.types'
import { formatFechaLarga, formatHora } from '@/lib/format'
import { descargarIcs } from '@/lib/ics'
import type { PropsPlantilla } from './tipos'

/**
 * Plantilla "clasica": portada a pantalla completa, cuenta regresiva, actos,
 * detalles y confirmacion.
 *
 * Los colores van escritos aca y no salen de los tokens del panel a
 * proposito: la invitacion no cambia de aspecto segun el modo oscuro del
 * celular del invitado, y cada plantilla nueva trae su propia paleta.
 */
export default function Clasica({
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

  return (
    <div ref={ref} className="min-h-screen bg-[#fbf7f4] text-[#3a2f2e]">
      {/* ── Portada ── */}
      <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 text-center">
        {c.imagen_portada ? (
          <>
            <img
              src={c.imagen_portada}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-black/35" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#f3e6e1] to-[#fbf7f4]" />
        )}

        <div
          className={
            'relative max-w-xl ' + (c.imagen_portada ? 'text-white drop-shadow-sm' : 'text-[#3a2f2e]')
          }
        >
          {c.frase && (
            <p className="mb-4 text-xs uppercase tracking-[0.35em] opacity-90">{c.frase}</p>
          )}
          <h1 className="font-serif text-6xl leading-none sm:text-7xl">{titulo}</h1>
          {evento.fecha_evento && (
            <p className="mt-5 font-serif text-lg italic opacity-95">
              {formatFechaLarga(evento.fecha_evento)}
            </p>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <a
            href="#confirmar"
            className={
              'whitespace-nowrap rounded-full border px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] backdrop-blur-sm transition-colors ' +
              (c.imagen_portada
                ? 'border-white/60 text-white hover:bg-white/15'
                : 'border-[#c9aba1] text-[#8a3b4a] hover:bg-[#8a3b4a]/8')
            }
          >
            Confirmar asistencia
          </a>
        </div>
      </header>

      {/* ── Saludo + cuenta regresiva ── */}
      <Seccion>
        <p className="text-center text-xs uppercase tracking-[0.3em] text-[#8c7a74]">{saludo}</p>
        {c.mensaje && (
          <p className="mx-auto mt-5 max-w-xl text-center font-serif text-xl leading-relaxed text-[#5c4b46] sm:text-2xl">
            {c.mensaje}
          </p>
        )}
        {evento.fecha_evento && (
          <div className="mt-8">
            <CuentaRegresiva fecha={evento.fecha_evento} />
          </div>
        )}
      </Seccion>

      {/* ── Actos: ceremonia, fiesta, civil ── */}
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
                className="inline-flex items-center gap-2 rounded-full border border-[#d9c6bf] bg-white px-5 py-2.5 text-xs uppercase tracking-widest text-[#8a3b4a] transition-colors hover:bg-[#f7efec]"
              >
                <CalendarPlus className="size-4" /> Agendar
              </button>
            </div>
          )}
        </Seccion>
      )}

      {/* ── Detalles sueltos ── */}
      {(c.dress_code || c.regalos || c.notas) && (
        <Seccion titulo="Detalles">
          <div className="grid gap-4 sm:grid-cols-2">
            {c.dress_code && (
              <Detalle icono={<Shirt className="size-4" />} titulo="Dress code">
                {c.dress_code}
              </Detalle>
            )}
            {c.regalos && (
              <Detalle icono={<Gift className="size-4" />} titulo="Regalos">
                {c.regalos}
              </Detalle>
            )}
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
          <p className="font-serif text-xl text-[#8a3b4a]">
            {c.hashtag.startsWith('#') ? c.hashtag : `#${c.hashtag}`}
          </p>
        )}
        {c.contacto_nombre && (
          <p className="mt-3 text-xs text-[#8c7a74]">
            Dudas: {c.contacto_nombre}
            {c.contacto_telefono && ` · ${c.contacto_telefono}`}
          </p>
        )}
      </footer>
    </div>
  )
}

function Seccion({
  titulo,
  id,
  children,
}: {
  titulo?: string
  id?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="aparece px-6 py-14 sm:py-16">
      <div className="mx-auto max-w-2xl">
        {titulo && (
          <h2 className="mb-8 text-center font-serif text-3xl text-[#8a3b4a]">{titulo}</h2>
        )}
        {children}
      </div>
    </section>
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
    <div className="rounded-lg border border-[#e6d8d2] bg-white/70 p-5 text-center">
      <h3 className="font-serif text-2xl text-[#3a2f2e]">{acto.titulo}</h3>
      {acto.fecha && (
        <p className="mt-1 text-sm text-[#8c7a74]">
          {formatFechaLarga(acto.fecha)} · {formatHora(acto.fecha)}
        </p>
      )}
      {acto.lugar && <p className="mt-3 text-sm font-medium text-[#3a2f2e]">{acto.lugar}</p>}
      {acto.direccion && <p className="text-sm text-[#8c7a74]">{acto.direccion}</p>}
      {destino && (
        <a
          href={destino}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#d9c6bf] px-4 py-2 text-xs uppercase tracking-widest text-[#8a3b4a] transition-colors hover:bg-[#f7efec]"
        >
          <MapPin className="size-3.5" /> Como llegar
        </a>
      )}
    </div>
  )
}

function Detalle({
  icono,
  titulo,
  children,
}: {
  icono?: ReactNode
  titulo: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#e6d8d2] bg-white/70 p-5">
      <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8c7a74]">
        {icono}
        {titulo}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#3a2f2e]">{children}</p>
    </div>
  )
}
