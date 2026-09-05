import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Si falta el .env la app no explota: muestra un cartel de "falta configurar"
 * en vez de una pantalla en blanco.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Un solo cliente para todo. Las paginas publicas (la invitacion y el
 * reporte) lo usan sin sesion: la anon key no les da acceso a ninguna tabla,
 * solo a las tres funciones RPC de 004_rpc_publico.sql.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
)
