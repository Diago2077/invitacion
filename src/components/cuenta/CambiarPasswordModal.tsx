import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { supabase } from '@/lib/supabase'

const MINIMO = 8

/**
 * Cambio de la propia contrasena. No pasa por ninguna funcion serverless:
 * supabase.auth.updateUser() actua sobre el usuario de la sesion y nada mas,
 * asi que no hay nada que verificar del lado del servidor.
 */
export function CambiarPasswordModal({
  abierto,
  onCerrar,
}: {
  abierto: boolean
  onCerrar: () => void
}) {
  const [password, setPassword] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function cerrar() {
    setPassword('')
    setRepetida('')
    setError(null)
    onCerrar()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (guardando) return

    if (password.length < MINIMO) {
      setError(`La contrasena tiene que tener al menos ${MINIMO} caracteres.`)
      return
    }
    if (password !== repetida) {
      setError('Las dos contrasenas no coinciden.')
      return
    }

    setError(null)
    setGuardando(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setGuardando(false)

    if (err) {
      setError('No se pudo cambiar la contrasena. Volvé a iniciar sesion e intentá de nuevo.')
      return
    }
    toast.success('Contrasena actualizada')
    cerrar()
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Cambiar mi contrasena"
      onCerrar={cerrar}
      ancho="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={cerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button form="form-password" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-password" onSubmit={onSubmit} className="space-y-4">
        <Field label="Nueva contrasena" hint={`Minimo ${MINIMO} caracteres.`}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Repetir contrasena">
          <Input
            type="password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </form>
    </Modal>
  )
}
