import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { draftInputAfterSave, emptyDraftInput, parseDraftInput, type DraftInput } from '@/domain/draft'
import { tryParseMoney } from '@/domain/money'
import { toIsoDate } from '@/domain/period'
import { validateTransactionDraft } from '@/domain/validation'

const TODAY = '2026-08-15'

describe('emptyDraftInput', () => {
  it('arranca como gasto en ARS, de contado, sin monto ni categoría', () => {
    expect(emptyDraftInput(TODAY)).toEqual({
      type: 'expense', amount: '', currency: 'ARS', fxRate: '', categoryId: null,
      accountId: null, accountType: null, installmentsCount: 1, occurredOn: TODAY,
    })
  })
  it('la fecha es el today que recibe, no la del reloj (C1)', () =>
    expect(emptyDraftInput('2020-02-29').occurredOn).toBe('2020-02-29'))
})

describe('toIsoDate (US-03)', () => {
  it('formatea con ceros a la izquierda', () => expect(toIsoDate(new Date(2026, 0, 5, 12))).toBe('2026-01-05'))

  describe('en la zona horaria del usuario, no en UTC', () => {
    const original = process.env.TZ
    beforeAll(() => { process.env.TZ = 'America/Argentina/Buenos_Aires' })
    afterAll(() => { process.env.TZ = original })

    it('a las 22:30 en Argentina sigue siendo el mismo día, aunque en UTC ya sea mañana', () => {
      const instant = new Date('2026-09-26T01:30:00Z') // 25/09 22:30 en UTC-3
      expect(instant.toISOString().slice(0, 10)).toBe('2026-09-26')
      expect(toIsoDate(instant)).toBe('2026-09-25')
    })
    it('pasada la medianoche local cambia de día', () =>
      expect(toIsoDate(new Date('2026-09-26T03:00:00Z'))).toBe('2026-09-26'))
    it('el 31/12 a la noche no salta de año', () =>
      expect(toIsoDate(new Date('2027-01-01T02:59:00Z'))).toBe('2026-12-31'))
  })
})

describe('tryParseMoney', () => {
  it.each([
    ['1234.56', '1234.56'], ['1234,56', '1234.56'], ['1.234,56', '1234.56'], [' 10 ', '10'],
    ['0', '0'], ['-5', '-5'], ['-1.234,5', '-1234.5'],
    // Puntos de miles sin coma: entero en formato argentino, no decimales.
    ['1.500', '1500'], ['10.000', '10000'], ['1.234.567', '1234567'], ['1.5', '1.5'], ['1.50', '1.5'],
  ])('%j → %s', (raw, expected) => expect(tryParseMoney(raw)?.toFixed()).toBe(expected))
  it.each(['', '   ', 'abc', '-', '1e3', '0x10', 'Infinity', 'NaN', '12,3,4', '1.23.456', '$100'])(
    '%j no es un monto → null', (raw) => expect(tryParseMoney(raw)).toBeNull())
})

describe('parseDraftInput + validateTransactionDraft (US-11)', () => {
  const filled = { ...emptyDraftInput(TODAY), categoryId: 'c1', accountId: 'a1', accountType: 'cash' as const }
  const amountError = (amount: string) => validateTransactionDraft(parseDraftInput({ ...filled, amount }), TODAY).amount
  it.each(['', '0', '0,00', '-5', 'abc'])('monto %j no deja guardar y dice por qué', (amount) =>
    expect(amountError(amount)).toBe('El monto debe ser mayor a cero'))
  it('un monto positivo con coma decimal es válido', () =>
    expect(validateTransactionDraft(parseDraftInput({ ...filled, amount: '1.500,50' }), TODAY)).toEqual({}))
  it('fxRate vacío en ARS queda null, no cuenta como tipo de cambio (I5)', () =>
    expect(parseDraftInput(filled).fxRate).toBeNull())
})

describe('draftInputAfterSave (US-10)', () => {
  const saved: DraftInput = {
    type: 'expense', amount: '1.500,50', currency: 'ARS', fxRate: '', categoryId: 'c1',
    accountId: 'a1', accountType: 'credit_card', installmentsCount: 3, occurredOn: '2026-08-10',
  }
  it('vuelve al estado inicial conservando la última cuenta usada', () =>
    expect(draftInputAfterSave(saved, TODAY)).toEqual({
      ...emptyDraftInput(TODAY), accountId: 'a1', accountType: 'credit_card',
    }))
  it('la fecha vuelve a ser hoy aunque se haya guardado una pasada', () =>
    expect(draftInputAfterSave(saved, '2026-08-16').occurredOn).toBe('2026-08-16'))
  it('el formulario que queda no se puede volver a guardar sin cargar un monto', () =>
    expect(validateTransactionDraft(parseDraftInput(draftInputAfterSave(saved, TODAY)), TODAY)).toHaveProperty('amount'))
})
describe('Valores por defecto y restricciones del formulario (US-04, US-05, US-07, US-08)', () => {
  it('US-04: tipo precargado en gasto', () => {
    expect(emptyDraftInput(TODAY).type).toBe('expense')
  })

  it('US-05: moneda precargada en ARS', () => {
    expect(emptyDraftInput(TODAY).currency).toBe('ARS')
  })

  it('US-07: cuenta precargada con la última usada tras guardar', () => {
    const previous: DraftInput = {
      ...emptyDraftInput(TODAY),
      accountId: 'acc-last',
      accountType: 'cash',
      amount: '500',
    }
    const after = draftInputAfterSave(previous, TODAY)
    expect(after.accountId).toBe('acc-last')
    expect(after.accountType).toBe('cash')
  })

  it('US-08: es válido y guarda sin descripción', () => {
    const draft = parseDraftInput({
      ...emptyDraftInput(TODAY),
      amount: '1000',
      categoryId: 'cat-1',
      accountId: 'acc-1',
      accountType: 'cash',
    })
    expect(validateTransactionDraft(draft, TODAY)).toEqual({})
  })
})