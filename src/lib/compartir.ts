import type { Evento, Invitacion } from './database.types'
import { formatFechaLarga, numeroWhatsapp } from './format'

/** URL publica de una invitacion. El token es lo unico que la protege. */
export function urlInvitacion(evento: Pick<Evento, 'slug'>, token: string): string {
  return `${window.location.origin}/i/${evento.slug}/${token}`
}

/** URL del tablero de solo lectura que se le pasa al cliente. */
export function urlReporte(reporteToken: string): string {
  return `${window.location.origin}/r/${reporteToken}`
}

/**
 * Mensaje sugerido para mandar por WhatsApp. Es un punto de partida editable:
 * el modal lo muestra en un textarea antes de copiarlo.
 */
export function mensajeInvitacion(
  evento: Pick<Evento, 'slug' | 'nombre' | 'fecha_evento' | 'contenido'>,
  invitacion: Pick<Invitacion, 'token' | 'nombre_grupo' | 'saludo'>,
): string {
  const titulo = evento.contenido?.titulo?.trim() || evento.nombre
  const saludo = invitacion.saludo?.trim() || invitacion.nombre_grupo
  const fecha = formatFechaLarga(evento.fecha_evento)

  return [
    `Hola ${saludo}!`,
    '',
    `Tenemos el gusto de invitarlos a ${titulo}${fecha ? `, el ${fecha}` : ''}.`,
    '',
    'Toda la informacion y la confirmacion de asistencia estan en este link:',
    urlInvitacion(evento, invitacion.token),
  ].join('\n')
}

/**
 * Link de WhatsApp con el mensaje ya cargado. Devuelve null si el telefono no
 * sirve: en ese caso el modal ofrece copiar el texto y pegarlo a mano.
 */
export function linkWhatsapp(telefono: string | null | undefined, mensaje: string): string | null {
  const numero = numeroWhatsapp(telefono)
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

/**
 * Copia al portapapeles. navigator.clipboard necesita https (o localhost);
 * si no esta disponible cae al textarea invisible, que anda en todos lados.
 */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // sigue al plan B
  }

  try {
    const area = document.createElement('textarea')
    area.value = texto
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}
