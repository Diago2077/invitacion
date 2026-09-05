import { describe, expect, it } from 'vitest'
import { pasesAsignados, textoCupo, validarPases } from './pases'

describe('validarPases', () => {
  it('en nominal no valida cantidades: el total sale de las marcas', () => {
    expect(validarPases('nominal', null, 0)).toBeNull()
    expect(validarPases('nominal', 2, 99)).toBeNull()
  })

  it('exige al menos una persona en cupo y abierto', () => {
    expect(validarPases('cupo', 4, 0)).toMatch(/cuantas personas/i)
    expect(validarPases('abierto', null, 0)).toMatch(/cuantas personas/i)
    expect(validarPases('abierto', null, 1.5)).toMatch(/cuantas personas/i)
  })

  it('no deja pasarse del cupo asignado', () => {
    expect(validarPases('cupo', 4, 4)).toBeNull()
    expect(validarPases('cupo', 4, 5)).toBe('Tu invitacion tiene 4 lugares.')
    expect(validarPases('cupo', 1, 2)).toBe('Tu invitacion tiene 1 lugar.')
  })

  it('sin cupo cargado, cupo equivale a un solo lugar', () => {
    expect(validarPases('cupo', null, 1)).toBeNull()
    expect(validarPases('cupo', null, 2)).toBe('Tu invitacion tiene 1 lugar.')
  })

  it('en abierto el tope es opcional', () => {
    expect(validarPases('abierto', null, 12)).toBeNull()
    expect(validarPases('abierto', 5, 5)).toBeNull()
    expect(validarPases('abierto', 5, 6)).toBe('Como maximo pueden asistir 5 personas.')
  })
})

describe('pasesAsignados', () => {
  it('en nominal cuenta los nombres cargados', () => {
    expect(pasesAsignados('nominal', null, 3)).toBe(3)
  })

  it('una invitacion nominal sin nombres cargados vale por una persona', () => {
    expect(pasesAsignados('nominal', null, 0)).toBe(1)
  })

  it('en cupo y abierto cuenta los pases, o uno si no se fijaron', () => {
    expect(pasesAsignados('cupo', 4, 0)).toBe(4)
    expect(pasesAsignados('abierto', null, 0)).toBe(1)
  })
})

describe('textoCupo', () => {
  it('distingue singular de plural', () => {
    expect(textoCupo('nominal', null, 1)).toMatch(/personal/i)
    expect(textoCupo('nominal', null, 2)).toMatch(/2 personas/)
    expect(textoCupo('cupo', 1, 0)).toMatch(/1 lugar reservado/)
    expect(textoCupo('cupo', 3, 0)).toMatch(/3 lugares/)
  })

  it('en abierto avisa el tope solo si existe', () => {
    expect(textoCupo('abierto', null, 0)).toMatch(/cuantas personas/i)
    expect(textoCupo('abierto', 6, 0)).toMatch(/hasta 6/)
  })
})
