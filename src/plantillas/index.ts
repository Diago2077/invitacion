import type { ComponentType } from 'react'
import Clasica from './Clasica'
import Elegante from './Elegante'
import type { PropsPlantilla } from './tipos'

/**
 * Registro de plantillas. Sumar una es escribir el componente con la firma
 * de PropsPlantilla y agregarlo aca: el selector del panel y la pagina
 * publica salen los dos de este objeto, asi que no hay una segunda lista que
 * mantener sincronizada.
 */
export const PLANTILLAS: Record<string, { label: string; componente: ComponentType<PropsPlantilla> }> =
  {
    clasica: { label: 'Clasica', componente: Clasica },
    elegante: { label: 'Elegante (sobre animado + musica)', componente: Elegante },
  }

export const PLANTILLA_POR_DEFECTO = 'clasica'

export function obtenerPlantilla(nombre: string | undefined) {
  return (PLANTILLAS[nombre ?? ''] ?? PLANTILLAS[PLANTILLA_POR_DEFECTO]).componente
}
