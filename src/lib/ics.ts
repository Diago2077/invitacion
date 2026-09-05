/**
 * Archivo .ics para el boton "Agendar" de la invitacion.
 *
 * Se arma a mano en vez de con una libreria: son veinte lineas de texto con
 * un formato fijo, y no justifica sumarle peso al bundle que carga el
 * invitado desde el celular.
 */

function aUtc(fecha: Date): string {
  return `${fecha.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/** RFC 5545: nada de saltos de linea crudos ni comas sin escapar. */
function escapar(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function descargarIcs({
  titulo,
  inicio,
  lugar,
  descripcion,
  duracionHoras = 4,
}: {
  titulo: string
  inicio: string
  lugar?: string
  descripcion?: string
  duracionHoras?: number
}): void {
  const desde = new Date(inicio)
  if (Number.isNaN(desde.getTime())) return
  const hasta = new Date(desde.getTime() + duracionHoras * 3600_000)

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//invitaciones//ES',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@invitaciones`,
    `DTSTAMP:${aUtc(new Date())}`,
    `DTSTART:${aUtc(desde)}`,
    `DTEND:${aUtc(hasta)}`,
    `SUMMARY:${escapar(titulo)}`,
    lugar ? `LOCATION:${escapar(lugar)}` : null,
    descripcion ? `DESCRIPTION:${escapar(descripcion)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const blob = new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'evento.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
