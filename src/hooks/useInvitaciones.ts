import { useCallback, useEffect, useState } from 'react'
import type {
  InvitacionConInvitados,
  InvitacionInsert,
  InvitacionUpdate,
} from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

interface Estado {
  data: InvitacionConInvitados[]
  loading: boolean
  error: string | null
}

/** Lo que hace falta para dar de alta una invitacion con su gente. */
export interface NuevaInvitacion {
  invitacion: InvitacionInsert
  /** Nombres cargados por el admin. En modo nominal son el cupo. */
  nombres: string[]
}

function ordenar(a: InvitacionConInvitados, b: InvitacionConInvitados) {
  return a.nombre_grupo.localeCompare(b.nombre_grupo, 'es')
}

export function useInvitaciones(eventoId: string | undefined) {
  const [estado, setEstado] = useState<Estado>({ data: [], loading: true, error: null })

  const refetch = useCallback(async () => {
    if (!eventoId) return
    setEstado((s) => ({ ...s, loading: true, error: null }))

    const { data, error } = await supabase
      .from('invitaciones')
      .select('*, invitados(*)')
      .eq('evento_id', eventoId)

    const filas = ((data as InvitacionConInvitados[]) ?? []).map((f) => ({
      ...f,
      invitados: [...(f.invitados ?? [])].sort((a, b) => a.orden - b.orden),
    }))

    setEstado({
      data: filas.sort(ordenar),
      loading: false,
      error: error ? 'No se pudieron cargar las invitaciones.' : null,
    })
  }, [eventoId])

  useEffect(() => {
    refetch()
  }, [refetch])

  /**
   * Alta de una invitacion con sus nombres. Son dos inserts y no uno solo
   * porque los invitados cuelgan de un id que recien existe despues del
   * primero; si el segundo falla, se borra la invitacion para no dejar un
   * grupo vacio a medio crear.
   */
  async function crear({ invitacion, nombres }: NuevaInvitacion) {
    const { data, error } = await supabase
      .from('invitaciones')
      .insert(invitacion)
      .select()
      .single()
    if (error || !data) return { data: null, error: 'No se pudo crear la invitacion.' }

    const limpios = nombres.map((n) => n.trim()).filter(Boolean)
    if (limpios.length > 0) {
      const { error: errNombres } = await supabase.from('invitados').insert(
        limpios.map((nombre, i) => ({
          invitacion_id: (data as { id: string }).id,
          orden: i,
          nombre,
        })),
      )
      if (errNombres) {
        await supabase.from('invitaciones').delete().eq('id', (data as { id: string }).id)
        return { data: null, error: 'No se pudieron guardar los nombres de los invitados.' }
      }
    }

    return { data: data as InvitacionConInvitados, error: null }
  }

  /**
   * Alta masiva (importacion de Excel/CSV). Inserta todas las invitaciones de
   * una y despues todos los invitados de una: con 200 filas, hacerlo de a una
   * serian 400 requests.
   */
  async function crearVarias(items: NuevaInvitacion[]) {
    if (items.length === 0) return { creadas: 0, error: null }

    const { data, error } = await supabase
      .from('invitaciones')
      .insert(items.map((i) => i.invitacion))
      .select('id, nombre_grupo')
    if (error || !data) return { creadas: 0, error: 'No se pudieron importar las invitaciones.' }

    const creadas = data as { id: string; nombre_grupo: string }[]
    const invitados = creadas.flatMap((fila, indice) =>
      (items[indice]?.nombres ?? [])
        .map((n) => n.trim())
        .filter(Boolean)
        .map((nombre, i) => ({ invitacion_id: fila.id, orden: i, nombre })),
    )

    if (invitados.length > 0) {
      const { error: errNombres } = await supabase.from('invitados').insert(invitados)
      if (errNombres) {
        return { creadas: creadas.length, error: 'Se crearon los grupos, pero fallaron los nombres.' }
      }
    }

    return { creadas: creadas.length, error: null }
  }

  async function actualizar(id: string, payload: InvitacionUpdate) {
    const { error } = await supabase.from('invitaciones').update(payload).eq('id', id)
    return { error: error ? 'No se pudo guardar.' : null }
  }

  /**
   * Reemplaza los nombres que cargo el admin. Los que sumo el propio invitado
   * al confirmar (origen 'invitado') no se tocan: son su respuesta, no datos
   * del panel.
   */
  async function reemplazarNombres(invitacionId: string, nombres: string[]) {
    await supabase.from('invitados').delete().eq('invitacion_id', invitacionId).eq('origen', 'admin')

    const limpios = nombres.map((n) => n.trim()).filter(Boolean)
    if (limpios.length === 0) return { error: null }

    const { error } = await supabase.from('invitados').insert(
      limpios.map((nombre, i) => ({ invitacion_id: invitacionId, orden: i, nombre })),
    )
    return { error: error ? 'No se pudieron guardar los nombres.' : null }
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('invitaciones').delete().eq('id', id)
    return { error: error ? 'No se pudo eliminar.' : null }
  }

  return { ...estado, refetch, crear, crearVarias, actualizar, reemplazarNombres, eliminar }
}
