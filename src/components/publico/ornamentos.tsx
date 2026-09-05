/**
 * Ornamentos decorativos de la plantilla "Elegante", dibujados en SVG.
 *
 * La referencia que inspira esta plantilla (invitaciones armadas en Canva)
 * usa ilustraciones en acuarela encargadas por pedido. Estas son la version
 * en codigo: no quedan tan "pintadas a mano", pero escalan a cualquier
 * pantalla, pesan unos pocos KB, se recolorean solas con la paleta del
 * evento y no hay que encargar arte nuevo por cada casamiento.
 */

const DORADO = '#c8a165'

/* ─────────────────────────────────────────────────────────────
 * Floritura: el separador entre secciones.
 * ───────────────────────────────────────────────────────────── */
export function Floritura({
  className = '',
  color = DORADO,
  ancho = 200,
}: {
  className?: string
  color?: string
  ancho?: number
}) {
  return (
    <svg
      viewBox="0 0 240 26"
      width={ancho}
      className={`mx-auto ${className}`}
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* Lineas laterales que se afinan hacia afuera */}
      <path d="M6 13 H96" opacity="0.5" />
      <path d="M144 13 H234" opacity="0.5" />
      {/* Volutas que abrazan el centro */}
      <path d="M96 13 C 102 5, 110 5, 112 11 C 113 15, 108 17, 106 14 C 104 11, 108 8, 114 13" />
      <path d="M144 13 C 138 21, 130 21, 128 15 C 127 11, 132 9, 134 12 C 136 15, 132 18, 126 13" />
      {/* Rombo central */}
      <path d="M120 6 L 126 13 L 120 20 L 114 13 Z" fill={color} stroke="none" />
      <circle cx="120" cy="13" r="1.4" fill="#fff" stroke="none" opacity="0.9" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
 * Marco hexagonal dorado, para encuadrar el monograma o la portada.
 * ───────────────────────────────────────────────────────────── */
export function Hexagono({
  className = '',
  color = DORADO,
  grosor = 1.2,
}: {
  className?: string
  color?: string
  grosor?: number
}) {
  return (
    <svg viewBox="0 0 200 224" className={className} fill="none" aria-hidden="true">
      <polygon
        points="100,4 194,58 194,166 100,220 6,166 6,58"
        stroke={color}
        strokeWidth={grosor}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
 * Ramo de flores secas para las esquinas.
 *
 * Cada fronda es la misma hoja alargada rotada y escalada desde un punto
 * base: repetir una forma simple con distintos angulos y tonos da la
 * sensacion de ramo sin dibujar cada tallo a mano.
 * ───────────────────────────────────────────────────────────── */
function Fronda({
  rotacion,
  escala = 1,
  color,
  opacidad = 1,
}: {
  rotacion: number
  escala?: number
  color: string
  opacidad?: number
}) {
  return (
    <g transform={`rotate(${rotacion}) scale(${escala})`} opacity={opacidad}>
      <path d="M0 0 C 7 -24, 7 -50, 0 -74 C -7 -50, -7 -24, 0 0 Z" fill={color} />
    </g>
  )
}

function Tallo({
  rotacion,
  largo = 78,
  color,
}: {
  rotacion: number
  largo?: number
  color: string
}) {
  return (
    <g transform={`rotate(${rotacion})`}>
      <path d={`M0 0 L 0 -${largo}`} stroke={color} strokeWidth="1" fill="none" />
      {[0.35, 0.55, 0.75, 0.9].map((t) => (
        <g key={t}>
          <ellipse cx="-4" cy={-largo * t} rx="4.5" ry="2.2" fill={color} opacity="0.75" transform={`rotate(-25 -4 ${-largo * t})`} />
          <ellipse cx="4" cy={-largo * t + 6} rx="4.5" ry="2.2" fill={color} opacity="0.75" transform={`rotate(25 4 ${-largo * t + 6})`} />
        </g>
      ))}
    </g>
  )
}

export function RamoEsquina({
  className = '',
  espejado = false,
  opacidad = 0.85,
}: {
  className?: string
  /** Refleja el ramo para usarlo en la esquina opuesta. */
  espejado?: boolean
  opacidad?: number
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      style={{ transform: espejado ? 'scaleX(-1)' : undefined, opacity: opacidad }}
    >
      <g transform="translate(34,182)">
        {/* Pampas y hojas secas, del mas claro al mas saturado */}
        <Fronda rotacion={-8} escala={1.15} color="#e0cdb0" />
        <Fronda rotacion={-32} escala={0.95} color="#d3bd9a" />
        <Fronda rotacion={16} escala={1} color="#dcc7ae" />
        <Fronda rotacion={-56} escala={0.78} color="#bfc7b2" opacidad={0.9} />
        <Fronda rotacion={42} escala={0.72} color="#d9b79a" opacidad={0.9} />
        <Fronda rotacion={-20} escala={0.6} color="#c9a165" opacidad={0.55} />
        <Tallo rotacion={-44} largo={70} color="#b0bda3" />
        <Tallo rotacion={28} largo={62} color="#cbb08f" />
        {/* Bayas sueltas */}
        <circle cx="-26" cy="-62" r="3" fill="#c99a7a" opacity="0.8" />
        <circle cx="-18" cy="-76" r="2.2" fill="#c99a7a" opacity="0.7" />
        <circle cx="22" cy="-54" r="2.6" fill="#c8a165" opacity="0.7" />
        <circle cx="12" cy="-88" r="2" fill="#c8a165" opacity="0.6" />
      </g>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
 * Vestido + traje en linea, para la tarjeta de dress code.
 * ───────────────────────────────────────────────────────────── */
export function IconoVestimenta({ className = '', color = DORADO }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 124 96"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* Vestido */}
      <path d="M38 20 L46 13 L54 20 L52 36 C 60 54, 64 74, 64 88 L 26 88 C 26 74, 30 54, 38 36 Z" />
      <path d="M38 20 C 42 26, 50 26, 54 20" />
      <path d="M31 62 H 60" opacity="0.5" />
      {/* Traje */}
      <path d="M80 22 L88 15 L96 22 L102 28 L102 88 L74 88 L74 28 Z" />
      <path d="M88 15 L88 44" />
      <path d="M82 20 L88 32 L94 20" />
      <circle cx="88" cy="52" r="1.4" fill={color} stroke="none" />
      <circle cx="88" cy="62" r="1.4" fill={color} stroke="none" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
 * Anillos entrelazados, para la seccion de ceremonia.
 * ───────────────────────────────────────────────────────────── */
export function IconoAnillos({ className = '', color = DORADO }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none" stroke={color} strokeWidth="1.3" aria-hidden="true">
      <circle cx="26" cy="22" r="13" />
      <circle cx="40" cy="22" r="13" />
      <path d="M40 9 L 43 4 L 46 9" strokeLinejoin="round" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
 * Copas brindando, para la seccion de fiesta.
 * ───────────────────────────────────────────────────────────── */
export function IconoBrindis({ className = '', color = DORADO }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 64 44"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M14 6 L 26 10 L 24 22 A 6 6 0 0 1 12 20 Z" transform="rotate(-14 20 14)" />
      <path d="M50 6 L 38 10 L 40 22 A 6 6 0 0 0 52 20 Z" transform="rotate(14 44 14)" />
      <path d="M20 26 L 22 38 M 14 39 H 28" transform="rotate(-14 20 30)" />
      <path d="M44 26 L 42 38 M 36 39 H 50" transform="rotate(14 44 30)" />
    </svg>
  )
}
