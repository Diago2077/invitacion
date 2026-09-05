import type { ModoPases } from './database.types'

/**
 * Los tres modos de confirmar. Quien elige el modo es SIEMPRE el admin, por
 * invitacion: el invitado nunca decide bajo que regla contesta.
 *
 * Esta logica esta duplicada a proposito en confirmar_invitacion() (SQL). La
 * de aca es para avisarle al invitado antes de mandar; la de la base es la
 * que manda, porque el formulario se puede saltear.
 */
export const MODO_LABEL: Record<ModoPases, string> = {
  nominal: 'Personas especificas',
  cupo: 'Cantidad de lugares',
  abierto: 'El invitado decide',
}

export const MODO_DESC: Record<ModoPases, string> = {
  nominal: 'Los nombres van cargados. El invitado marca quien va y quien no.',
  cupo: 'Tiene N lugares asignados y elige cuantos usa.',
  abierto: 'Declara cuantos van. El maximo es opcional.',
}

/**
 * Cuantas personas cuenta esta invitacion antes de que respondan, para el
 * total de "invitados" del tablero. En nominal son los nombres cargados;
 * en los otros dos, los pases asignados (o 1 si no se fijo ninguno).
 */
export function pasesAsignados(
  modo: ModoPases,
  pases: number | null,
  cantidadInvitados: number,
): number {
  if (modo === 'nominal') return Math.max(cantidadInvitados, 1)
  return pases ?? 1
}

/**
 * Valida la cantidad que eligio el invitado. Devuelve el mensaje de error o
 * null si esta bien. En modo nominal no aplica: ahi se marca persona por
 * persona y el total sale de esas marcas.
 */
export function validarPases(
  modo: ModoPases,
  tope: number | null,
  pedidos: number,
): string | null {
  if (modo === 'nominal') return null
  if (!Number.isInteger(pedidos) || pedidos < 1) {
    return 'Indica cuantas personas van a asistir.'
  }
  if (modo === 'cupo') {
    const limite = tope ?? 1
    if (pedidos > limite) {
      return `Tu invitacion tiene ${limite} ${limite === 1 ? 'lugar' : 'lugares'}.`
    }
    return null
  }
  if (tope !== null && pedidos > tope) {
    return `Como maximo pueden asistir ${tope} personas.`
  }
  return null
}

/** Como se le describe el cupo al invitado, arriba del formulario. */
export function textoCupo(modo: ModoPases, tope: number | null, cantidadInvitados: number): string {
  if (modo === 'nominal') {
    return cantidadInvitados === 1
      ? 'Esta invitacion es personal.'
      : `Esta invitacion es para ${cantidadInvitados} personas.`
  }
  if (modo === 'cupo') {
    const limite = tope ?? 1
    return limite === 1
      ? 'Tenes 1 lugar reservado.'
      : `Tenes ${limite} lugares reservados.`
  }
  return tope !== null
    ? `Pueden asistir hasta ${tope} personas.`
    : 'Contanos cuantas personas van a asistir.'
}
