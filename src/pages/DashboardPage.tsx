import { Link } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { formatPeriod } from '@/domain/period'
import { usePeriodParam } from '@/hooks/usePeriodParam'

interface DashboardPageProps {
  entriesCount?: number
}

export function DashboardPage({ entriesCount = 0 }: DashboardPageProps) {
  const { period, shift } = usePeriodParam()
  const hasData = entriesCount > 0

  return (
    <AppShell
      actions={
        <Link to="/register" data-testid="dashboard-nav-register" className="text-sm underline">
          Registrar
        </Link>
      }
    >
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => shift(-1)} data-testid="dashboard-period-prev">←</Button>
        <span data-testid="dashboard-period">{formatPeriod(period)}</span>
        <Button variant="outline" onClick={() => shift(1)} data-testid="dashboard-period-next">→</Button>
      </div>

      {!hasData ? (
        <div
          data-testid="dashboard-empty-state"
          className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
        >
          <p className="text-muted-foreground text-sm">
            No hay registros para este período.
          </p>
          <Link
            to="/register"
            data-testid="dashboard-empty-register-link"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Registrar transacción
          </Link>
        </div>
      ) : (
        <div data-testid="dashboard-content" className="mt-6">
          {/* Métricas y contenido del dashboard cuando hay datos */}
        </div>
      )}
    </AppShell>
  )
}