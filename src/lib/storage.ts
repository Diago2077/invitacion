import { supabase } from './supabase'

const BUCKET = 'eventos'

function extensionDe(mime: string, nombreOriginal: string): string {
  const porMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  }
  if (porMime[mime]) return porMime[mime]
  const ext = nombreOriginal.split('.').pop()
  return ext && ext.length <= 5 ? ext.toLowerCase() : 'jpg'
}

/**
 * Sube una foto al bucket publico, bajo {evento_id}/...
 *
 * El bucket es publico de lectura: la URL que devuelve no vence nunca. Una
 * signed URL habria sido mas prolija, pero se vence y dejaria la portada
 * rota justo el dia del evento.
 */
export async function subirFoto(
  eventoId: string,
  archivo: File,
): Promise<{ url: string } | { error: string }> {
  if (archivo.size > 8 * 1024 * 1024) {
    return { error: 'La imagen supera los 8 MB. Probá con una version mas liviana.' }
  }

  const ext = extensionDe(archivo.type, archivo.name)
  const path = `${eventoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, archivo, {
    contentType: archivo.type || undefined,
    upsert: false,
  })
  if (error) return { error: 'No se pudo subir la imagen.' }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

/**
 * Borra una foto a partir de su URL publica. Silencioso ante errores: que
 * quede un archivo huerfano en el bucket es mucho menos grave que frenar al
 * usuario mientras edita el contenido.
 */
export async function eliminarFoto(url: string | null | undefined): Promise<void> {
  if (!url) return
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  if (i === -1) return
  const path = decodeURIComponent(url.slice(i + marca.length).split('?')[0])
  await supabase.storage.from(BUCKET).remove([path])
}
