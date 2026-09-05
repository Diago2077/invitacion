import { useCallback, useEffect, useState } from 'react'
import type { Evento, EventoInsert, EventoUpdate } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

interface Estado {
  data: Evento[]
  loading: boolean
  error: string | null
}

function mensajeDeError(codigo: string | undefined): string {
  // 23505 = unique_violation. El unico unique que puede chocar aca es el slug
  // (el reporte_token lo genera la base y es aleatorio).
  return codigo === '23505'
    ? 'Ya hay un evento con ese link. Cambiá el nombre o el slug.'
    : 'No se pudo guardar.'
}

/**
 * Todos los eventos. Son pocos por definicion (un evento = un cliente que
 * contrato), asi que se traen enteros y se filtra en el cliente.
 */
export function useEventos() {
  const [estado, setEstado] = useState<Estado>({ data: [], loading: true, error: null })

  const refetch = useCallback(async () => {
    setEstado((s) => ({ ...s, loading: true, error: null }))
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('fecha_evento', { ascending: false, nullsFirst: false })

    setEstado({
      data: (data as Evento[]) ?? [],
      loading: false,
      error: error ? 'No se pudieron cargar los eventos.' : null,
    })
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  async function crear(payload: EventoInsert) {
    const { data, error } = await supabase.from('eventos').insert(payload).select().single()
    if (error) return { data: null, error: mensajeDeError(error.code) }
    return { data: data as Evento, error: null }
  }

  async function actualizar(id: string, payload: EventoUpdate) {
    const { error } = await supabase.from('eventos').update(payload).eq('id', id)
    if (error) return { error: mensajeDeError(error.code) }
    return { error: null }
  }

  return { ...estado, refetch, crear, actualizar }
}

export function useEvento(id: string | undefined) {
  const [data, setData] = useState<Evento | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data: fila } = await supabase.from('eventos').select('*').eq('id', id).maybeSingle()
    setData((fila as Evento) ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, refetch }
}
