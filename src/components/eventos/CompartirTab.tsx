import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { copiar, urlReporte } from '@/lib/compartir'
import type { Evento } from '@/lib/database.types'

/**
 * Los dos links que salen de un evento:
 *   - el de cada invitacion, personal, que se arma en la pestana "Invitados";
 *   - el del reporte, uno solo, que se le pasa al cliente.
 */
export function CompartirTab({ evento }: { evento: Evento }) {
  const reporte = urlReporte(evento.reporte_token)

  async function copiarLink() {
    const ok = await copiar(reporte)
    if (ok) toast.success('Link copiado')
    else toast.error('No se pudo copiar. Seleccioná el texto y copialo a mano.')
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Link de seguimiento para el cliente"
          description="Solo lectura: ve las confirmaciones en vivo, no puede editar nada ni entrar al panel."
        />
        <CardBody className="space-y-4">
          <Field label="Link">
            <div className="flex gap-2">
              <Input readOnly value={reporte} onFocus={(e) => e.currentTarget.select()} />
              <Button variant="outline" onClick={copiarLink}>
                <Copy /> Copiar
              </Button>
              <a
                href={reporte}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-9.5 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <ExternalLink className="size-4" /> Abrir
              </a>
            </div>
          </Field>

          <p className="text-xs text-muted-foreground">
            Cualquiera con este link puede ver la lista de confirmaciones, asi que pasáselo solo a
            los novios. Si alguna vez hace falta invalidarlo, se cambia el{' '}
            <code className="rounded bg-secondary px-1">reporte_token</code> del evento en Supabase
            y el link viejo deja de servir.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Links de los invitados"
          description="Cada invitacion tiene el suyo, y es lo unico que la protege."
        />
        <CardBody className="space-y-3 text-sm text-muted-foreground">
          <p>
            La direccion de cada una es{' '}
            <code className="rounded bg-secondary px-1">
              /i/{evento.slug}/<span className="text-foreground">token</span>
            </code>
            . Se copian desde la pestana <strong>Invitados</strong>, con el boton de compartir de
            cada fila, que ademas arma el mensaje de WhatsApp.
          </p>
          <p>
            No hay un link general para todos a proposito: si lo hubiera, no se podria saber quien
            confirmo ni respetar los pases de cada familia.
          </p>
          <p>
            Con <strong>Exportar</strong> en esa misma pestana te llevás la lista completa con los
            links en una columna, por si querés mandarlos desde otro lado.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
