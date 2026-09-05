import { ImagePlus, Loader2, Music, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { useEventos } from '@/hooks/useEventos'
import type { Acto, ContenidoEvento, Evento, FamiliaPersona } from '@/lib/database.types'
import { paraInputDateTime } from '@/lib/format'
import { eliminarFoto, subirFoto, subirMusica } from '@/lib/storage'
import { PLANTILLAS } from '@/plantillas'

/**
 * Carga del contenido de la invitacion.
 *
 * Es un formulario, no el editor visual: eso es la fase 2. Lo que importa
 * hoy es que todo lo que escribe acá termina en `eventos.contenido` (jsonb),
 * que es exactamente lo que va a leer y escribir ese editor cuando exista --
 * asi que nada de esto se tira despues.
 *
 * Los campos de familias/historia/galeria/musica solo los usa la plantilla
 * "Elegante" hoy, pero se muestran siempre: quedan guardados en el evento
 * aunque este en "Clasica", y aparecen solos si mas adelante se cambia de
 * plantilla.
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
  const inputGaleria = useRef<HTMLInputElement>(null)
  const inputMusica = useRef<HTMLInputElement>(null)

  const [plantilla, setPlantilla] = useState(evento.plantilla)
  const [c, setC] = useState<ContenidoEvento>(evento.contenido ?? {})
  const [actos, setActos] = useState<Acto[]>(evento.contenido?.actos ?? [])
  const [subiendo, setSubiendo] = useState(false)
  const [subiendoGaleria, setSubiendoGaleria] = useState(false)
  const [subiendoMusica, setSubiendoMusica] = useState(false)
  const [guardando, setGuardando] = useState(false)

  function set<K extends keyof ContenidoEvento>(campo: K, valor: ContenidoEvento[K]) {
    setC((prev) => ({ ...prev, [campo]: valor }))
  }

  function setFamilia(cual: 'familia_1' | 'familia_2', campo: keyof FamiliaPersona, valor: string) {
    setC((prev) => ({ ...prev, [cual]: { ...prev[cual], [campo]: valor } }))
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
        cita: '',
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

  async function onGaleria(e: ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])]
    e.target.value = ''
    if (archivos.length === 0) return

    setSubiendoGaleria(true)
    const nuevas: string[] = []
    for (const archivo of archivos) {
      const resultado = await subirFoto(evento.id, archivo)
      if ('error' in resultado) toast.error(resultado.error)
      else nuevas.push(resultado.url)
    }
    setSubiendoGaleria(false)
    if (nuevas.length > 0) set('galeria', [...(c.galeria ?? []), ...nuevas])
  }

  function quitarDeGaleria(url: string) {
    set('galeria', (c.galeria ?? []).filter((u) => u !== url))
    eliminarFoto(url)
  }

  async function onMusica(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    setSubiendoMusica(true)
    const resultado = await subirMusica(evento.id, archivo)
    setSubiendoMusica(false)

    if ('error' in resultado) {
      toast.error(resultado.error)
      return
    }
    const anterior = c.musica_url
    set('musica_url', resultado.url)
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
            <Field
              label="Plantilla"
              hint={
                plantilla === 'elegante'
                  ? 'Suma sobre animado, musica, familias, historia y galeria.'
                  : undefined
              }
            >
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
          title="Musica de fondo"
          description='Arranca sola cuando el invitado toca el sello del sobre (solo en la plantilla "Elegante").'
        />
        <CardBody className="space-y-3">
          {c.musica_url ? (
            <div className="flex flex-wrap items-center gap-3">
              <audio src={c.musica_url} controls className="h-9 max-w-xs" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const url = c.musica_url
                  set('musica_url', undefined)
                  eliminarFoto(url)
                }}
                title="Quitar musica"
              >
                <X />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin musica, la invitacion abre en silencio.</p>
          )}
          <input
            ref={inputMusica}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a"
            className="hidden"
            onChange={onMusica}
          />
          <Button
            variant="outline"
            onClick={() => inputMusica.current?.click()}
            disabled={subiendoMusica}
          >
            {subiendoMusica ? <Loader2 className="animate-spin" /> : <Music />}
            {subiendoMusica ? 'Subiendo…' : c.musica_url ? 'Cambiar musica' : 'Subir musica'}
          </Button>
          <p className="text-xs text-muted-foreground">Hasta 10 MB. Un mp3 corto y comprimido alcanza.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Nuestras familias"
          description='Opcional. Se muestra como "Nuestras familias" (solo en "Elegante").'
        />
        <CardBody className="grid gap-6 sm:grid-cols-2">
          <BloqueFamilia
            titulo="Novio/a 1"
            persona={c.familia_1 ?? { nombre: '' }}
            onChange={(campo, valor) => setFamilia('familia_1', campo, valor)}
          />
          <BloqueFamilia
            titulo="Novio/a 2"
            persona={c.familia_2 ?? { nombre: '' }}
            onChange={(campo, valor) => setFamilia('familia_2', campo, valor)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Nuestra historia" description="Un parrafo tipo 'como nos conocimos'." />
        <CardBody>
          <Textarea
            value={c.historia ?? ''}
            onChange={(e) => set('historia', e.target.value)}
            placeholder="Nos conocimos en…"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Galeria de fotos"
          description="Un carrusel con las fotos que elijas, en este orden."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputGaleria.current?.click()}
              disabled={subiendoGaleria}
            >
              {subiendoGaleria ? <Loader2 className="animate-spin" /> : <Plus />}
              {subiendoGaleria ? 'Subiendo…' : 'Agregar fotos'}
            </Button>
          }
        />
        <CardBody>
          <input
            ref={inputGaleria}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={onGaleria}
          />
          {!c.galeria || c.galeria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavia no cargaste fotos.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {c.galeria.map((url) => (
                <div key={url} className="group relative overflow-hidden rounded-md border border-border">
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => quitarDeGaleria(url)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="Quitar"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
                <Field
                  label="Cita o frase (opcional)"
                  hint='Una lectura, un versiculo: "Elegante" la muestra debajo del lugar.'
                  className="sm:col-span-2"
                >
                  <Input
                    value={acto.cita ?? ''}
                    onChange={(e) => setActo(acto.id, 'cita', e.target.value)}
                    placeholder="Lo que Dios ha unido, que no lo separe el hombre."
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

function BloqueFamilia({
  titulo,
  persona,
  onChange,
}: {
  titulo: string
  persona: FamiliaPersona
  onChange: (campo: keyof FamiliaPersona, valor: string) => void
}) {
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <Field label="Nombre">
        <Input value={persona.nombre ?? ''} onChange={(e) => onChange('nombre', e.target.value)} />
      </Field>
      <Field label="Padres" hint="Texto libre, tal como se muestra.">
        <Input
          value={persona.padres ?? ''}
          onChange={(e) => onChange('padres', e.target.value)}
          placeholder="Juan Perez y Maria Gomez"
        />
      </Field>
      <Field label="Hermanos">
        <Input
          value={persona.hermanos ?? ''}
          onChange={(e) => onChange('hermanos', e.target.value)}
          placeholder="Sofia y Martin"
        />
      </Field>
    </div>
  )
}
