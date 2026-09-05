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

function extensionAudio(mime: string, nombreOriginal: string): string {
  const porMime: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
  }
  if (porMime[mime]) return porMime[mime]
  const ext = nombreOriginal.split('.').pop()
  return ext && ext.length <= 5 ? ext.toLowerCase() : 'mp3'
}

/**
 * Sube la musica de fondo de una plantilla (ej. "Elegante"), al mismo bucket
 * publico que las fotos. El limite es mas generoso que el de una foto: una
 * cancion comprimida en 128kbps pesa bastante mas que una imagen.
 */
export async function subirMusica(
  eventoId: string,
  archivo: File,
): Promise<{ url: string } | { error: string }> {
  if (archivo.size > 10 * 1024 * 1024) {
    return { error: 'El audio supera los 10 MB. Proba con una version mas corta o mas comprimida.' }
  }

  const ext = extensionAudio(archivo.type, archivo.name)
  const path = `${eventoId}/musica-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, archivo, {
    contentType: archivo.type || undefined,
    upsert: false,
  })
  if (error) return { error: 'No se pudo subir el audio.' }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

function extensionVideo(mime: string, nombreOriginal: string): string {
  const porMime: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  }
  if (porMime[mime]) return porMime[mime]
  const ext = nombreOriginal.split('.').pop()
  return ext && ext.length <= 5 ? ext.toLowerCase() : 'mp4'
}

/**
 * Sube el video de apertura de una plantilla (ej. "Elegante"), al mismo
 * bucket publico que las fotos. El limite es bastante mas generoso: un
 * video corto ya pesa varios MB aunque este comprimido.
 */
export async function subirVideo(
  eventoId: string,
  archivo: File,
): Promise<{ url: string } | { error: string }> {
  if (archivo.size > 30 * 1024 * 1024) {
    return { error: 'El video supera los 30 MB. Comprimilo o acortalo antes de subirlo.' }
  }

  const ext = extensionVideo(archivo.type, archivo.name)
  const path = `${eventoId}/video-apertura-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, archivo, {
    contentType: archivo.type || undefined,
    upsert: false,
  })
  if (error) return { error: 'No se pudo subir el video.' }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

/**
 * Borra un archivo del bucket a partir de su URL publica (foto, audio o
 * video: el bucket es el mismo y el parseo no depende del tipo). Silencioso
 * ante errores: que quede un archivo huerfano es mucho menos grave que
 * frenar al usuario mientras edita el contenido.
 */
export async function eliminarFoto(url: string | null | undefined): Promise<void> {
  if (!url) return
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  if (i === -1) return
  const path = decodeURIComponent(url.slice(i + marca.length).split('?')[0])
  await supabase.storage.from(BUCKET).remove([path])
}
