import { useCallback, useEffect, useState } from 'react'
import type { RespuestaInvitacion, RespuestaReporte } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

/**
 * Las paginas publicas no leen tablas: llaman a las funciones de
 * 004_rpc_publico.sql. La anon key no les da acceso a nada mas, asi que un
 * token equivocado devuelve null y no una fila de otro evento.
 */
export function useInvitacionPublica(token: string | undefined) {
  const [data, setData] = useState<RespuestaInvitacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setError('Link invalido.')
      return
    }
    setLoading(true)
    const { data: json, error: err } = await supabase.rpc('invitacion_por_token', {
      p_token: token,
    })
    setLoading(false)

    if (err) {
      setError('No pudimos cargar la invitacion. Probá de nuevo en un momento.')
      return
    }
    if (!json) {
      setError('Este link no es valido o ya no esta disponible.')
      return
    }
    setError(null)
    setData(json as RespuestaInvitacion)
  }, [token])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

export function useReportePublico(token: string | undefined) {
  const [data, setData] = useState<RespuestaReporte | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setError('Link invalido.')
      return
    }
    setLoading(true)
    const { data: json, error: err } = await supabase.rpc('reporte_por_token', { p_token: token })
    setLoading(false)

    if (err) {
      setError('No pudimos cargar el reporte. Probá de nuevo en un momento.')
      return
    }
    if (!json) {
      setError('Este link no es valido o ya no esta disponible.')
      return
    }
    setError(null)
    setData(json as RespuestaReporte)
  }, [token])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
