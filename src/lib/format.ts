/** Formateo con las convenciones paraguayas (es-PY, +595, dd/mm/aaaa). */

/** '2026-03-14' o un timestamp → '14/03/2026'. */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [fecha] = iso.split('T')
  const [a, m, d] = fecha.split('-')
  if (!a || !m || !d) return iso
  return `${d}/${m}/${a}`
}

export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return '—'
  return `${formatFecha(iso)} ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`
}

/** 'sabado 14 de marzo de 2026'. Para la portada de la invitacion. */
export function formatFechaLarga(iso: string | null | undefined): string {
  if (!iso) return ''
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return ''
  return new Intl.DateTimeFormat('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(f)
}

export function formatHora(iso: string | null | undefined): string {
  if (!iso) return ''
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return ''
  return new Intl.DateTimeFormat('es-PY', { hour: '2-digit', minute: '2-digit' }).format(f)
}

/**
 * Valor para un <input type="datetime-local">, en hora LOCAL.
 * toISOString() no sirve: pasa a UTC y en Paraguay adelanta o atrasa la hora
 * mostrada respecto de la que se cargo.
 */
export function paraInputDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}T${p(f.getHours())}:${p(f.getMinutes())}`
}

/** Normaliza texto para buscar sin tildes ni mayusculas. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

/** 'Ana & Luis' → 'ana-y-luis'. Es la parte legible del link publico. */
export function slugify(texto: string): string {
  return normalizar(texto)
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Numero en formato internacional para wa.me, sin el '+'.
 * Acepta lo que se escribe a diario en Paraguay: '0981 123 456',
 * '981123456', '+595 981 123456'. Devuelve null si no parece un numero.
 */
export function numeroWhatsapp(telefono: string | null | undefined): string | null {
  const d = String(telefono ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('595')) return d.length >= 11 ? d : null
  if (d.startsWith('0')) return `595${d.slice(1)}`
  // Un celular paraguayo sin el 0 inicial: 9 digitos empezando en 9
  if (d.length === 9 && d.startsWith('9')) return `595${d}`
  // Cualquier otra cosa se asume ya internacional (otro pais)
  return d.length >= 10 ? d : null
}

/** Dias que faltan para una fecha. Negativo si ya paso. */
export function diasHasta(iso: string | null | undefined): number | null {
  if (!iso) return null
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return null
  const hoy = new Date()
  const soloDia = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((soloDia(f) - soloDia(hoy)) / 86400000)
}
