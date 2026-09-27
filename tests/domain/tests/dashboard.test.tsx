import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DashboardPage } from '@/pages/DashboardPage'

describe('DashboardPage (US-33: Estado vacío)', () => {
  it('muestra el estado vacío y el enlace al registro cuando no hay datos', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard?period=2026-09']}>
        <DashboardPage entriesCount={0} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('dashboard-empty-state')).toBeInTheDocument()
    expect(screen.getByText('No hay registros para este período.')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-empty-register-link')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument()
  })

  it('muestra el contenido del dashboard cuando hay transacciones', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard?period=2026-09']}>
        <DashboardPage entriesCount={3} />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('dashboard-empty-state')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
  })
})