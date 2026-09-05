import { Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { Evento, InvitacionConInvitados } from '@/lib/database.types'
import { copiar, linkWhatsapp, mensajeInvitacion, urlInvitacion } from '@/lib/compartir'

/**
 * Genera el link de una invitacion y el mensaje para mandarlo.
 *
 * No manda nada por si solo: abre el chat de WhatsApp con el texto cargado y
 * el envio lo hace la persona. Es a proposito -- no hay API de por medio, no
 * hay costo por mensaje y no hay riesgo de que bloqueen el numero por mandar
 * doscientos mensajes seguidos.
 */
export function CompartirModal({
  abierto,
  evento,
  invitacion,
  onCerrar,
  onEnviada,
}: {
  abierto: boolean
  evento: Evento
  invitacion: InvitacionConInvitados | null
  onCerrar: () => void
  onEnviada: (id: string) => void
}) {
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (abierto && invitacion) setMensaje(mensajeInvitacion(evento, invitacion))
  }, [abierto, evento, invitacion])

  if (!invitacion) return null

  const url = urlInvitacion(evento, invitacion.token)
  const wa = linkWhatsapp(invitacion.telefono, mensaje)

  async function copiarTexto(texto: string, queCosa: string) {
    const ok = await copiar(texto)
    if (!ok) {
      toast.error('No se pudo copiar. Seleccioná el texto y copialo a mano.')
      return
    }
    toast.success(`${queCosa} copiado`)
    if (invitacion) onEnviada(invitacion.id)
  }

  return (
    <Modal
      abierto={abierto}
      titulo={`Compartir con ${invitacion.nombre_grupo}`}
      descripcion={
        evento.estado === 'publicado'
          ? undefined
          : 'El evento esta en borrador: quien abra el link va a ver una vista previa y no va a poder confirmar.'
      }
      onCerrar={onCerrar}
      ancho="max-w-xl"
      footer={
        <Button variant="outline" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Link personal de esta invitacion">
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" onClick={() => copiarTexto(url, 'Link')}>
              <Copy /> Copiar
            </Button>
          </div>
        </Field>

        <Field
          label="Mensaje"
          hint="Editalo si querés: se copia tal cual lo dejes."
        >
          <Textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="min-h-36"
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => onEnviada(invitacion.id)}
              className="inline-flex h-9.5 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <MessageCircle className="size-4" /> Abrir WhatsApp
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">
              Cargá el telefono de esta invitacion para abrir WhatsApp directo.
            </p>
          )}

          <Button variant="outline" onClick={() => copiarTexto(mensaje, 'Mensaje')}>
            <Copy /> Copiar mensaje
          </Button>

          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-9.5 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ExternalLink className="size-4" /> Ver como la ve el invitado
          </a>
        </div>
      </div>
    </Modal>
  )
}
