import type {
  EventoPublico,
  InvitacionPublica,
  InvitadoPublico,
} from '@/lib/database.types'

/**
 * Lo que recibe cualquier plantilla. Es identico a lo que devuelve
 * invitacion_por_token(), asi que agregar una plantilla nueva es escribir un
 * componente con esta firma y registrarlo en plantillas/index.ts.
 */
export interface PropsPlantilla {
  evento: EventoPublico
  invitacion: InvitacionPublica
  invitados: InvitadoPublico[]
  /** Motivo por el que no se puede confirmar; null si se puede. */
  bloqueado: string | null
  onConfirmado: () => void
}
