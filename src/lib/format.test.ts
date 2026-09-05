import { describe, expect, it } from 'vitest'
import { formatFecha, numeroWhatsapp, slugify } from './format'

describe('slugify', () => {
  it('arma la parte legible del link', () => {
    expect(slugify('Ana & Luis')).toBe('ana-y-luis')
    expect(slugify('  Sofía   Giménez  ')).toBe('sofia-gimenez')
    expect(slugify('15 años de Martina!')).toBe('15-anos-de-martina')
  })

  it('no deja guiones sueltos en los bordes', () => {
    expect(slugify('---hola---')).toBe('hola')
    expect(slugify('!!!')).toBe('')
  })
})

describe('numeroWhatsapp', () => {
  it('completa el codigo de Paraguay', () => {
    expect(numeroWhatsapp('0981 123 456')).toBe('595981123456')
    expect(numeroWhatsapp('981123456')).toBe('595981123456')
    expect(numeroWhatsapp('+595 981 123456')).toBe('595981123456')
  })

  it('deja pasar numeros de otros paises', () => {
    expect(numeroWhatsapp('+54 9 11 5555 4444')).toBe('5491155554444')
  })

  it('descarta lo que no puede ser un telefono', () => {
    expect(numeroWhatsapp('')).toBeNull()
    expect(numeroWhatsapp(null)).toBeNull()
    expect(numeroWhatsapp('1234')).toBeNull()
  })
})

describe('formatFecha', () => {
  it('pasa a dd/mm/aaaa y aguanta un timestamp', () => {
    expect(formatFecha('2026-03-14')).toBe('14/03/2026')
    expect(formatFecha('2026-03-14T20:30:00+00:00')).toBe('14/03/2026')
    expect(formatFecha(null)).toBe('—')
  })
})
