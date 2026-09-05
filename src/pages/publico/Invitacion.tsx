import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Cargando } from '@/components/ui/estado'
import { useInvitacionPublica } from '@/hooks/usePublico'
import { obtenerPlantilla } from '@/plantillas'

/**
 * La pagina que abre el invitado. Sin login: el token de la URL es lo unico
 * que la habilita, y todo lo que se muestra sale de invitacion_por_token().
 */
export default function Invitacion() {
  const { token } = useParams<{ token: string }>()
  const { data, loading, error, refetch } = useInvitacionPublica(token)

  useEffect(() => {
    if (!data) return
    const titulo = data.evento.contenido?.titulo?.trim() || data.evento.nombre
    document.title = titulo
  }, [data])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf7f4]">
        <Cargando texto="Abriendo tu invitacion…" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf7f4] px-6 text-center">
        <div>
          <p className="font-serif text-3xl text-[#8a3b4a]">Ups</p>
          <p className="mt-2 max-w-sm text-sm text-[#8c7a74]">
            {error ?? 'Este link no es valido o ya no esta disponible.'}
          </p>
          <p className="mt-4 text-xs text-[#b9a9a3]">
            Si te lo pasaron por WhatsApp, fijate de copiarlo entero.
          </p>
        </div>
      </div>
    )
  }

  // No se crea un componente aca: se elige uno del registro, que son
  // referencias estables de modulo. Como el nombre sale de la base, el lint
  // no puede saberlo.
  const Plantilla = obtenerPlantilla(data.evento.plantilla)

  return (
    <>
      {/* En borrador el link sirve de vista previa; la cinta evita que alguien
          crea que ya esta publicada y se quede esperando confirmaciones. */}
      {data.evento.estado === 'borrador' && (
        <div className="sticky top-0 z-50 bg-[#8a3b4a] px-4 py-1.5 text-center text-xs text-white">
          Vista previa · todavia no publicada
        </div>
      )}
      <Plantilla
        evento={data.evento}
        invitacion={data.invitacion}
        invitados={data.invitados}
        bloqueado={data.puede_confirmar ? null : data.motivo}
        onConfirmado={refetch}
      />
    </>
  )
}
