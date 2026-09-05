type Celda = string | number | boolean | null | undefined

function escapar(valor: Celda): string {
  const s = valor === null || valor === undefined ? '' : String(valor)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Descarga las filas como CSV.
 *
 * Separador ';' y BOM al principio: es lo que hace que Excel en espanol abra
 * el archivo ya separado en columnas y con las tildes bien, sin pasar por el
 * asistente de importacion.
 */
export function descargarCsv(nombreArchivo: string, filas: Celda[][]): void {
  const texto = filas.map((f) => f.map(escapar).join(';')).join('\r\n')
  const blob = new Blob([`﻿${texto}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
