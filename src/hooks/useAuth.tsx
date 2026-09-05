import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Usuario } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  /** Fila de `usuarios`: de aca sale el rol. */
  perfil: Usuario | null
  loading: boolean
  esSuperAdmin: boolean
  /**
   * Hay sesion valida pero el panel no se puede usar:
   * - 'sin-perfil': la fila de `usuarios` no existe (el usuario se creo en el
   *   dashboard de Supabase y nadie corrio el alta correspondiente).
   * - 'inactivo': el usuario esta desactivado.
   * - 'sin-permiso': existe y esta activo, pero no es super_admin.
   * Sin esto, la pantalla queda en blanco en vez de explicar por que.
   */
  problemaPerfil: 'sin-perfil' | 'inactivo' | 'sin-permiso' | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [problemaPerfil, setProblemaPerfil] = useState<AuthState['problemaPerfil']>(null)
  const [loading, setLoading] = useState(true)

  // Evita que una carga de perfil vieja pise a una nueva al cambiar de sesion
  const cargaActual = useRef(0)

  const cargarPerfil = useCallback(async (userId: string | undefined) => {
    const token = ++cargaActual.current

    if (!userId) {
      setPerfil(null)
      setProblemaPerfil(null)
      return
    }

    const { data: fila, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (token !== cargaActual.current) return

    if (error || !fila) {
      setPerfil(null)
      setProblemaPerfil('sin-perfil')
      return
    }

    const usuario = fila as Usuario
    setPerfil(usuario)
    setProblemaPerfil(
      !usuario.activo ? 'inactivo' : usuario.rol !== 'super_admin' ? 'sin-permiso' : null,
    )
  }, [])

  useEffect(() => {
    let vivo = true
    // Compara el usuario, no el nombre del evento: supabase-js revalida la
    // sesion cada vez que la pestana recupera el foco, y segun la version eso
    // puede disparar 'SIGNED_IN' (no solo 'TOKEN_REFRESHED') aunque sea el
    // mismo usuario de siempre. Si a eso se le hace setLoading(true), el
    // AppLayout desmonta el Outlet y se pierde cualquier formulario a medio
    // llenar. Reaccionar solo a un cambio real de usuario evita el problema.
    const usuarioIdAnterior = { current: undefined as string | undefined }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      usuarioIdAnterior.current = data.session?.user?.id
      setSession(data.session)
      await cargarPerfil(data.session?.user?.id)
      if (vivo) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_evento, nuevaSesion) => {
      if (!vivo) return
      setSession(nuevaSesion)

      const idNuevo = nuevaSesion?.user?.id
      if (idNuevo === usuarioIdAnterior.current) return
      usuarioIdAnterior.current = idNuevo

      setLoading(true)
      await cargarPerfil(idNuevo)
      if (vivo) setLoading(false)
    })

    return () => {
      vivo = false
      subscription.unsubscribe()
    }
  }, [cargarPerfil])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    // No se expone el mensaje crudo de Supabase: filtra si el email existe o no
    if (error) {
      const esCredencial = /invalid login|credentials/i.test(error.message)
      return {
        error: esCredencial
          ? 'Email o contrasena incorrectos.'
          : 'No se pudo iniciar sesion. Intentalo de nuevo.',
      }
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setPerfil(null)
    setProblemaPerfil(null)
  }, [])

  const valor = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      perfil,
      loading,
      esSuperAdmin: perfil?.rol === 'super_admin' && perfil.activo,
      problemaPerfil,
      signIn,
      signOut,
    }),
    [session, perfil, loading, problemaPerfil, signIn, signOut],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return ctx
}
