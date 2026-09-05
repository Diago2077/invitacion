// Genera los PNG de iconos a partir del logo SVG. Se corre a mano cuando el
// logo cambia (no es parte del build normal); usa `sharp` como dependencia
// de un solo uso, sin agregarla a package.json:
//
//   npm install --no-save sharp
//   node scripts/generate-icons.mjs
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const PRIMARY = '#8a3b4a'

// glyph: sobre abierto con un corazon de lacre. Coordenadas pensadas para un
// viewBox de 100x100, con el contenido dentro del 80% central para que no lo
// recorte el "safe zone" de los iconos maskable.
const GLYPH = `
  <rect x="20" y="30" width="60" height="44" rx="7" fill="#ffffff"/>
  <path d="M23,34 L50,56 L77,34" fill="none" stroke="${PRIMARY}" stroke-width="4.5"
        stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
  <path d="M50,71 C40,64 34,58.5 34,52.5 A7.5,7.5 0 0 1 50,48 A7.5,7.5 0 0 1 66,52.5 C66,58.5 60,64 50,71 Z"
        fill="${PRIMARY}"/>
`.trim()

function svg({ rounded }) {
  const bg = rounded
    ? `<rect width="100" height="100" rx="22" fill="${PRIMARY}"/>`
    : `<rect width="100" height="100" fill="${PRIMARY}"/>`
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${bg}${GLYPH}</svg>`
}

const SVG_ROUNDED = svg({ rounded: true })
const SVG_SQUARE = svg({ rounded: false })

mkdirSync('public/icons', { recursive: true })

writeFileSync('public/logo.svg', SVG_ROUNDED)
writeFileSync('public/favicon.svg', SVG_ROUNDED)

const trabajos = [
  { svg: SVG_ROUNDED, size: 180, out: 'public/icons/apple-touch-icon.png' },
  { svg: SVG_ROUNDED, size: 192, out: 'public/icons/icon-192.png' },
  { svg: SVG_ROUNDED, size: 512, out: 'public/icons/icon-512.png' },
  { svg: SVG_SQUARE, size: 512, out: 'public/icons/icon-512-maskable.png' },
]

for (const t of trabajos) {
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(t.out)
  console.log('OK', t.out)
}
