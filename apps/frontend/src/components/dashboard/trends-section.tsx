'use client'

import { TrendCard } from '#components/dashboard/trend-card'
import { MiniTrendChart } from '#components/ui/charts/mini-trend-chart'
import { ErrorBoundary } from '#components/ui/error-boundary'
import { useOwnerDashboardData } from '#hooks/api/use-owner-dashboard'

export function TrendsSection() {
	return (
		<ErrorBoundary
			fallback={
				<section className="dashboard-section">
					<div className="dashboard-section-header">
						<h2 className="dashboard-section-title">Trends & Performance</h2>
						<p className="dashboard-section-description">
							Unable to load trend data
						</p>
					</div>
				</section>
			}
		>
			<TrendsSectionContent />
		</ErrorBoundary>
	)
}

function TrendsSectionContent() {
  // Use unified dashboard data hook
  const { data, isLoading } = useOwnerDashboardData()

  const {
    metricTrends,
    timeSeries
  } = data ?? {}

  const {
    occupancyRate,
    activeTenants,
    monthlyRevenue,
    openMaintenance
  } = metricTrends ?? {}

  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <h2 className="dashboard-section-title">Trends & Performance</h2>
        <p className="dashboard-section-description">
          30-day comparison with previous period
        </p>
      </div>

      <div className="dashboard-trend-grid">
        <TrendCard
          title="Occupancy Rate"
          metric={occupancyRate}
          isLoading={isLoading}
          valueFormatter={(v) => v !== null ? `${v.toFixed(1)}%` : '0%'}
        />
        <TrendCard
          title="Active Tenants"
          metric={activeTenants}
          isLoading={isLoading}
          valueFormatter={(v) => v !== null ? v.toString() : '0'}
        />
        <TrendCard
          title="Monthly Revenue"
          metric={monthlyRevenue}
          isLoading={isLoading}
          valueFormatter={(v) =>
            v !== null
              ? `$${(v / 100).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '$0.00'
          }
        />
        <TrendCard
          title="Open Maintenance"
          metric={openMaintenance}
          isLoading={isLoading}
          valueFormatter={(v) => v !== null ? v.toString() : '0'}
        />
      </div>

      <div className="dashboard-grid">
        <MiniTrendChart
          title="Occupancy Rate (30 days)"
          data={timeSeries?.occupancyRate}
          isLoading={isLoading}
          valueFormatter={(v) => v !== null ? `${v.toFixed(1)}%` : '0%'}
          color="var(--color-primary)"
        />
        <MiniTrendChart
          title="Monthly Revenue (30 days)"
          data={timeSeries?.monthlyRevenue}
          isLoading={isLoading}
          valueFormatter={(v) =>
            v !== null
              ? `$${(v / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : '$0.00'
          }
          color="var(--color-success)"
        />
      </div>
    </section>
  )
}
