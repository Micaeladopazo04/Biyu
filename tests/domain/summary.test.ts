import { describe, expect, it } from 'vitest'
import {
  computeMonthlySummary,
  countDaysWithTransactions,
  type SummaryEntry,
} from '@/domain/summary'

const entry = (o: Partial<SummaryEntry> & { tx?: Partial<SummaryEntry['transaction']> }): SummaryEntry => ({
  period: '2026-09-01', installment_number: 1, amount_ars: '100.00',
  transaction: { id: 't', type: 'expense', category_id: 'c1', account_id: 'a1', first_period: '2026-09-01', deleted_at: null, ...o.tx },
  ...o,
})
const P = { year: 2026, month: 9 }

describe('computeMonthlySummary', () => {
  it('período vacío: todo en cero', () => {
    const s = computeMonthlySummary([], [], P)
    expect(s.expenses.toFixed(2)).toBe('0.00')
    expect(s.balance.toFixed(2)).toBe('0.00')
    expect(s.byCategory.size).toBe(0)
  })
  it('gastos, ingresos y balance; ignora otros períodos', () => {
    const s = computeMonthlySummary([
      entry({ amount_ars: '300.10' }),
      entry({ amount_ars: '0.20', tx: { category_id: 'c2' } }),
      entry({ amount_ars: '1000', tx: { type: 'income', category_id: null } }),
      entry({ period: '2026-08-01', amount_ars: '999' }),
    ], [], P)
    expect(s.expenses.toFixed(2)).toBe('300.30')
    expect(s.income.toFixed(2)).toBe('1000.00')
    expect(s.balance.toFixed(2)).toBe('699.70')
    expect(s.byCategory.get('c2')!.toFixed(2)).toBe('0.20')
  })
  it('las transacciones borradas no cuentan (I10)', () => {
    const s = computeMonthlySummary([entry({ tx: { deleted_at: '2026-09-02T00:00:00Z' } })], [], P)
    expect(s.expenses.toFixed(2)).toBe('0.00')
  })
  it('cuotas heredadas: installment_number > 1', () => {
    const s = computeMonthlySummary([entry({ installment_number: 2, amount_ars: '10000' }), entry({ amount_ars: '50' })], [], P)
    expect(s.inheritedInstallments.toFixed(2)).toBe('10000.00')
    expect(s.expenses.toFixed(2)).toBe('10050.00')
  })
  it('neto de reembolsos: bruto 120000 con deuda de 60000 → 60000', () => {
    const s = computeMonthlySummary(
      [entry({ amount_ars: '120000' })],
      [{ transaction_id: 't', direction: 'owed_to_me', amount_ars: '60000', transaction_first_period: '2026-09-01' }],
      P,
    )
    expect(s.expenses.toFixed(2)).toBe('120000.00')
    expect(s.netOfReimbursements.toFixed(2)).toBe('60000.00')
  })
})

describe('countDaysWithTransactions (US-32: Días del mes con al menos un registro)', () => {
  it('devuelve 0 si la lista de transacciones está vacía', () => {
    expect(countDaysWithTransactions([], P)).toBe(0)
  })

  it('cuenta correctamente días distintos con transacciones activas dentro del período', () => {
    const transactions = [
      { occurred_on: '2026-09-01', deleted_at: null },
      { occurred_on: '2026-09-01', deleted_at: null },
      { occurred_on: '2026-09-15', deleted_at: null },
    ]
    expect(countDaysWithTransactions(transactions, P)).toBe(2)
  })

  it('ignora transacciones borradas (soft delete)', () => {
    const transactions = [
      { occurred_on: '2026-09-01', deleted_at: null },
      { occurred_on: '2026-09-10', deleted_at: '2026-09-10T12:00:00Z' },
      { occurred_on: '2026-09-20', deleted_at: null },
    ]
    expect(countDaysWithTransactions(transactions, P)).toBe(2)
  })

  it('ignora transacciones que corresponden a otros períodos', () => {
    const transactions = [
      { occurred_on: '2026-08-31', deleted_at: null },
      { occurred_on: '2026-09-05', deleted_at: null },
      { occurred_on: '2026-10-01', deleted_at: null },
    ]
    expect(countDaysWithTransactions(transactions, P)).toBe(1)
  })
})