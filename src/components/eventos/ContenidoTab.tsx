import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { useEventos } from '@/hooks/useEventos'
import type { Acto, ContenidoEvento, Evento } from '@/lib/database.types'
import { paraInputDateTime } from '@/lib/format'
import { eliminarFoto, subirFoto } from '@/lib/storage'
import { PLANTILLAS } from '@/plantillas'

/**
 * Carga del contenido de la invitacion.
 *
 * Es un formulario, no el editor visual: eso es la fase 2. Lo que importa
 * hoy es que todo lo que escribe acá termina en `eventos.contenido` (jsonb),
 * que es exactamente lo que va a leer y escribir ese editor cuando exista --
 * asi que nada de esto se tira despues.
 */
export function ContenidoTab({
  evento,
  onGuardado,
}: {
  evento: Evento
  onGuardado: () => void
}) {
  const { actualizar } = useEventos()
  const inputFoto = useRef<HTMLInputElement>(null)

  const [plantilla, setPlantilla] = useState(evento.plantilla)
  const [c, setC] = useState<ContenidoEvento>(evento.contenido ?? {})
  const [actos, setActos] = useState<Acto[]>(evento.contenido?.actos ?? [])
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  function set<K extends keyof ContenidoEvento>(campo: K, valor: ContenidoEvento[K]) {
    setC((prev) => ({ ...prev, [campo]: valor }))
  }

  function setActo(id: string, campo: keyof Acto, valor: string) {
    setActos((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)))
  }

  function agregarActo() {
    setActos((prev) => [
      ...prev,
      {
        id: `acto-${Date.now()}`,
        titulo: prev.length === 0 ? 'Ceremonia' : 'Fiesta',
        fecha: evento.fecha_evento,
        lugar: '',
        direccion: '',
        maps_url: '',
      },
    ])
  }

  async function onFoto(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    setSubiendo(true)
    const resultado = await subirFoto(evento.id, archivo)
    setSubiendo(false)

    if ('error' in resultado) {
      toast.error(resultado.error)
      return
    }
    // La anterior se borra recien cuando la nueva ya subio: si falla la
    // subida, la invitacion sigue teniendo su portada.
    const anterior = c.imagen_portada
    set('imagen_portada', resultado.url)
    if (anterior) eliminarFoto(anterior)
  }

  async function guardar() {
    if (guardando) return
    setGuardando(true)
    const contenido: ContenidoEvento = {
      ...c,
      actos: actos.filter((a) => a.titulo.trim() || a.lugar.trim()),
    }
    const { error } = await actualizar(evento.id, { contenido, plantilla })
    setGuardando(false)

    if (error) {
      toast.error(error)
      return
    }
    toast.success('Invitacion guardada')
    onGuardado()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Todo esto es lo que ve el invitado. Mirá como queda con “Vista previa”.
        </p>
        <Button onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>

      <Card>
        <CardHeader title="Portada" description="Lo primero que se ve al abrir el link." />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plantilla">
              <Select value={plantilla} onChange={(e) => setPlantilla(e.target.value)}>
                {Object.entries(PLANTILLAS).map(([valor, { label }]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Titulo" hint="Si lo dejás vacio usa el nombre del evento.">
              <Input
                value={c.titulo ?? ''}
                onChange={(e) => set('titulo', e.target.value)}
                placeholder="Ana & Luis"
              />
            </Field>
          </div>

          <Field label="Frase de arriba">
            <Input
              value={c.frase ?? ''}
              onChange={(e) => set('frase', e.target.value)}
              placeholder="Nos casamos"
            />
          </Field>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Foto de portada</p>
            {c.imagen_portada ? (
              <div className="relative w-full max-w-sm overflow-hidden rounded-md border border-border">
                <img src={c.imagen_portada} alt="" className="aspect-[3/2] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    const url = c.imagen_portada
                    set('imagen_portada', undefined)
                    eliminarFoto(url)
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                  title="Quitar foto"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sin foto se usa un fondo degradé. Recomendado: horizontal, menos de 8 MB.
              </p>
            )}
            <input
              ref={inputFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={onFoto}
            />
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => inputFoto.current?.click()}
              disabled={subiendo}
            >
              {subiendo ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {subiendo ? 'Subiendo…' : c.imagen_portada ? 'Cambiar foto' : 'Subir foto'}
            </Button>
          </div>

          <Field label="Mensaje de bienvenida">
            <Textarea
              value={c.mensaje ?? ''}
              onChange={(e) => set('mensaje', e.target.value)}
              placeholder="Con la bendicion de nuestras familias, queremos compartir con ustedes este dia…"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Cuando y donde"
          description="La ceremonia, la fiesta, el civil: uno por cada lugar."
          action={
            <Button variant="outline" size="sm" onClick={agregarActo}>
              <Plus /> Agregar
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {actos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavia no cargaste ninguno. Sin esto la invitacion no dice a que hora ni donde es.
            </p>
          )}

          {actos.map((acto) => (
            <div key={acto.id} className="rounded-md border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Input
                  value={acto.titulo}
                  onChange={(e) => setActo(acto.id, 'titulo', e.target.value)}
                  placeholder="Ceremonia"
                  className="max-w-xs font-medium"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  title="Quitar"
                  onClick={() => setActos((prev) => prev.filter((a) => a.id !== acto.id))}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fecha y hora">
                  <Input
                    type="datetime-local"
                    value={paraInputDateTime(acto.fecha)}
                    onChange={(e) =>
                      setActo(
                        acto.id,
                        'fecha',
                        e.target.value ? new Date(e.target.value).toISOString() : '',
                      )
                    }
                  />
                </Field>
                <Field label="Lugar">
                  <Input
                    value={acto.lugar}
                    onChange={(e) => setActo(acto.id, 'lugar', e.target.value)}
                    placeholder="Iglesia San Jose"
                  />
                </Field>
                <Field label="Direccion">
                  <Input
                    value={acto.direccion}
                    onChange={(e) => setActo(acto.id, 'direccion', e.target.value)}
                    placeholder="Avda. Espana 1234, Asuncion"
                  />
                </Field>
                <Field
                  label="Link de Google Maps"
                  hint="Opcional: si no lo ponés, se busca por la direccion."
                >
                  <Input
                    value={acto.maps_url}
                    onChange={(e) => setActo(acto.id, 'maps_url', e.target.value)}
                    placeholder="https://maps.app.goo.gl/…"
                  />
                </Field>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Detalles" description="Se muestran solo los que completes." />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dress code">
              <Input
                value={c.dress_code ?? ''}
                onChange={(e) => set('dress_code', e.target.value)}
                placeholder="Elegante"
              />
            </Field>
            <Field label="Hashtag">
              <Input
                value={c.hashtag ?? ''}
                onChange={(e) => set('hashtag', e.target.value)}
                placeholder="#AnaYLuis2026"
              />
            </Field>
          </div>

          <Field label="Regalos" hint="Texto libre: mesa de regalos, datos bancarios, alias.">
            <Textarea value={c.regalos ?? ''} onChange={(e) => set('regalos', e.target.value)} />
          </Field>

          <Field label="Para tener en cuenta" hint="Avisos: solo adultos, estacionamiento, etc.">
            <Textarea value={c.notas ?? ''} onChange={(e) => set('notas', e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contacto para dudas">
              <Input
                value={c.contacto_nombre ?? ''}
                onChange={(e) => set('contacto_nombre', e.target.value)}
                placeholder="Sofia (hermana de la novia)"
              />
            </Field>
            <Field label="Telefono de contacto">
              <Input
                value={c.contacto_telefono ?? ''}
                onChange={(e) => set('contacto_telefono', e.target.value)}
                placeholder="0981 123 456"
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
