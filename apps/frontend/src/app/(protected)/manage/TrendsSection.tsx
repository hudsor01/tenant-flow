'use client'

import { TrendCard } from '#components/dashboard/trend-card'
import { MiniTrendChart } from '#components/dashboard/mini-trend-chart'
import { useOwnerMetricTrend, useOwnerTimeSeries } from '#hooks/api/use-owner-dashboard'

export function TrendsSection() {
  // Fetch all trend data
  const { data: occupancyRate, isLoading: isOccupancyRateLoading } = useOwnerMetricTrend('occupancy_rate', 'month')
  const { data: activeTenants, isLoading: isActiveTenantsLoading } = useOwnerMetricTrend('active_tenants', 'month')
  const { data: monthlyRevenue, isLoading: isMonthlyRevenueLoading } = useOwnerMetricTrend('monthly_revenue', 'month')
  const { data: openMaintenance, isLoading: isOpenMaintenanceLoading } = useOwnerMetricTrend('open_maintenance', 'month')

  // Fetch time series for charts
  const { data: occupancyTimeSeries, isLoading: isOccupancyLoading } = useOwnerTimeSeries({ metric: 'occupancy_rate', days: 30 })
  const { data: revenueTimeSeries, isLoading: isRevenueLoading } = useOwnerTimeSeries({ metric: 'monthly_revenue', days: 30 })

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
          isLoading={isOccupancyRateLoading}
          valueFormatter={(v) => `${v.toFixed(1)}%`}
        />
        <TrendCard
          title="Active Tenants"
          metric={activeTenants}
          isLoading={isActiveTenantsLoading}
          valueFormatter={(v) => v.toString()}
        />
        <TrendCard
          title="Monthly Revenue"
          metric={monthlyRevenue}
          isLoading={isMonthlyRevenueLoading}
          valueFormatter={(v) =>
            `$${(v / 100).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          }
        />
        <TrendCard
          title="Open Maintenance"
          metric={openMaintenance}
          isLoading={isOpenMaintenanceLoading}
          valueFormatter={(v) => v.toString()}
        />
      </div>

      <div className="dashboard-grid">
        <MiniTrendChart
          title="Occupancy Rate (30 days)"
          data={occupancyTimeSeries}
          isLoading={isOccupancyLoading}
          valueFormatter={(v) => `${v.toFixed(1)}%`}
          color="var(--primary)"
        />
        <MiniTrendChart
          title="Monthly Revenue (30 days)"
          data={revenueTimeSeries}
          isLoading={isRevenueLoading}
          valueFormatter={(v) =>
            `$${(v / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          }
          color="var(--color-success)"
        />
      </div>
    </section>
  )
}
