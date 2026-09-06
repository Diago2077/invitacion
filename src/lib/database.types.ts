/**
 * Tipos de la base, escritos a mano.
 *
 * Se mantienen a mano y no generados porque afinan cosas que el generador no
 * puede saber -- que `modo_pases` es una union de tres valores y no un string
 * suelto -- y porque llevan los comentarios que explican para que sirve cada
 * campo. La contra es que una migracion los puede dejar desactualizados en
 * silencio: cuando el proyecto de Supabase este creado conviene agregar
 * `npm run tipos` (ver README) y chequear el desfasaje en tiempo de compilado.
 */

export type Rol = 'super_admin' | 'cliente'
export type TipoEvento = 'casamiento' | 'cumpleanos' | 'quince' | 'bautismo' | 'corporativo' | 'otro'
export type EstadoEvento = 'borrador' | 'publicado' | 'cerrado' | 'archivado'
export type ModoPases = 'nominal' | 'cupo' | 'abierto'
export type EstadoInvitacion = 'pendiente' | 'confirmado' | 'parcial' | 'rechazado'

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  casamiento: 'Casamiento',
  cumpleanos: 'Cumpleanos',
  quince: 'Quince anos',
  bautismo: 'Bautismo',
  corporativo: 'Corporativo',
  otro: 'Otro',
}

export const ESTADO_EVENTO_LABEL: Record<EstadoEvento, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  cerrado: 'Cerrado',
  archivado: 'Archivado',
}

export const ESTADO_INVITACION_LABEL: Record<EstadoInvitacion, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  parcial: 'Parcial',
  rechazado: 'No asiste',
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  created_at: string
}

/**
 * Un acto dentro del evento: la ceremonia, la fiesta, el civil.
 * Son varios porque casi siempre hay al menos dos, en lugares distintos.
 */
export interface Acto {
  /** Id local para la lista del formulario; no lo usa la base. */
  id: string
  titulo: string
  /** ISO con hora. Puede ser distinta de la fecha principal del evento. */
  fecha: string | null
  lugar: string
  direccion: string
  /** Link de Google Maps tal como sale del boton "Compartir". */
  maps_url: string
  /** Frase o cita corta debajo del lugar (una lectura, un versiculo, etc). */
  cita?: string
}

/** Uno de los novios/protagonistas, para la seccion "nuestras familias". */
export interface FamiliaPersona {
  nombre: string
  /** Texto libre: 'Cyril Philip y Soly Joseph'. */
  padres?: string
  /** Texto libre: 'Sruthi y Sreya'. */
  hermanos?: string
}

/**
 * Lo que dibuja la plantilla. Vive en `eventos.contenido` (jsonb) y no en
 * columnas: cada plantilla usa lo suyo, y el editor visual de la fase 2 va a
 * sumarle secciones sin que eso sea una migracion.
 *
 * Todo es opcional a proposito: una invitacion a medio cargar tiene que
 * poder mostrarse igual, sin romperse.
 */
export interface ContenidoEvento {
  /** 'Ana & Luis'. Si falta, la plantilla usa el nombre del evento. */
  titulo?: string
  /** 'Nos casamos', 'Te esperamos'. */
  frase?: string
  /** URL publica de la foto de portada (bucket `eventos`). */
  imagen_portada?: string
  /** Parrafo de bienvenida. */
  mensaje?: string
  actos?: Acto[]
  dress_code?: string
  /** Texto libre: alias de mesa de regalos, datos bancarios, etc. */
  regalos?: string
  /** Avisos: 'Solo adultos', 'No llevar rojo'. */
  notas?: string
  hashtag?: string
  /** A quien escribir por dudas. */
  contacto_nombre?: string
  contacto_telefono?: string
  /** Para la plantilla "elegante": seccion "nuestras familias". */
  familia_1?: FamiliaPersona
  familia_2?: FamiliaPersona
  /** Parrafo tipo "como nos conocimos". */
  historia?: string
  /** URLs publicas del bucket `eventos`, en el orden en que se muestran. */
  galeria?: string[]
  /** URL publica de un audio del bucket `eventos`, para el fondo musical. */
  musica_url?: string
  /**
   * URL publica de un video del bucket `eventos`, para la portada. Si esta
   * cargado, reemplaza al sobre animado en CSS: se reproduce una vez y se
   * desvanece hacia el contenido. El video se genera por fuera (Veo,
   * Gemini, etc.) y se sube ya armado con los nombres de la pareja.
   */
  video_apertura_url?: string
}

export interface Evento {
  id: string
  slug: string
  tipo: TipoEvento
  nombre: string
  fecha_evento: string | null
  plantilla: string
  contenido: ContenidoEvento
  modo_pases_default: ModoPases
  confirmar_hasta: string | null
  estado: EstadoEvento
  /** Token del link de solo lectura del cliente: /r/{reporte_token}. Lo genera la base. */
  reporte_token: string
  cliente_nombre: string | null
  cliente_telefono: string | null
  cliente_email: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Invitacion {
  id: string
  evento_id: string
  /** Lo genera la base. Es lo unico que protege el link. */
  token: string
  nombre_grupo: string
  saludo: string | null
  modo_pases: ModoPases
  /** cupo: lugares asignados. abierto: tope maximo (null = sin tope). nominal: no se usa. */
  pases: number | null
  telefono: string | null
  email: string | null
  mesa: string | null
  /** Privado: nunca sale en la invitacion publica. */
  notas: string | null
  estado: EstadoInvitacion
  pases_confirmados: number
  mensaje_invitado: string | null
  confirmado_at: string | null
  visto_at: string | null
  vistas: number
  enviado_at: string | null
  created_at: string
  updated_at: string
}

export interface Invitado {
  id: string
  invitacion_id: string
  orden: number
  nombre: string
  es_menor: boolean
  /** null = todavia no respondio por esta persona. */
  asiste: boolean | null
  restriccion: string | null
  /** 'admin' = lo cargo el panel; 'invitado' = lo sumo el propio invitado al confirmar. */
  origen: 'admin' | 'invitado'
  created_at: string
}

/** Campos que la base calcula sola y que no se mandan nunca en un insert. */
export type EventoInsert = Omit<
  Evento,
  'id' | 'created_at' | 'updated_at' | 'reporte_token' | 'estado'
> & { estado?: EstadoEvento }
export type EventoUpdate = Partial<Omit<Evento, 'id' | 'created_at' | 'updated_at' | 'reporte_token'>>

export type InvitacionInsert = Omit<
  Invitacion,
  | 'id'
  | 'token'
  | 'created_at'
  | 'updated_at'
  | 'estado'
  | 'pases_confirmados'
  | 'mensaje_invitado'
  | 'confirmado_at'
  | 'visto_at'
  | 'vistas'
  | 'enviado_at'
>
export type InvitacionUpdate = Partial<Omit<Invitacion, 'id' | 'token' | 'created_at' | 'updated_at'>>

export type InvitadoInsert = Omit<Invitado, 'id' | 'created_at'>

/** Invitacion con su gente, tal como la devuelve el listado del panel. */
export interface InvitacionConInvitados extends Invitacion {
  invitados: Invitado[]
}

// ─────────────────────────────────────────────────────────────
// Lo que devuelven las funciones publicas (004_rpc_publico.sql).
// Son jsonb armados a mano en SQL: si se toca una, hay que tocar esto.
// ─────────────────────────────────────────────────────────────

export interface EventoPublico {
  nombre: string
  tipo: TipoEvento
  slug: string
  fecha_evento: string | null
  plantilla: string
  contenido: ContenidoEvento
  confirmar_hasta: string | null
  estado: EstadoEvento
}

export interface InvitacionPublica {
  token: string
  nombre_grupo: string
  saludo: string | null
  modo_pases: ModoPases
  pases: number | null
  estado: EstadoInvitacion
  pases_confirmados: number
  mensaje_invitado: string | null
  confirmado_at: string | null
  mesa: string | null
}

export interface InvitadoPublico {
  id: string
  nombre: string
  es_menor: boolean
  asiste: boolean | null
  restriccion: string | null
  origen: 'admin' | 'invitado'
}

export interface RespuestaInvitacion {
  evento: EventoPublico
  invitacion: InvitacionPublica
  invitados: InvitadoPublico[]
  puede_confirmar: boolean
  motivo: string | null
}

export interface TotalesReporte {
  invitaciones: number
  confirmadas: number
  rechazadas: number
  pendientes: number
  vistas: number
  personas_confirmadas: number
  personas_invitadas: number
}

export interface FilaReporte {
  token: string
  nombre_grupo: string
  estado: EstadoInvitacion
  modo_pases: ModoPases
  pases: number | null
  pases_confirmados: number
  telefono: string | null
  mesa: string | null
  mensaje_invitado: string | null
  confirmado_at: string | null
  visto_at: string | null
  invitados: { nombre: string; asiste: boolean | null; es_menor: boolean; restriccion: string | null }[]
}

export interface RespuestaReporte {
  evento: Pick<EventoPublico, 'nombre' | 'tipo' | 'slug' | 'fecha_evento' | 'confirmar_hasta' | 'estado'>
  totales: TotalesReporte
  invitaciones: FilaReporte[]
}
