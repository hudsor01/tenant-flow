'use client'

import { TrendCard } from '#components/dashboard/trend-card'
import { MiniTrendChart } from '#components/dashboard/mini-trend-chart'
import { useDashboardTrendData, useDashboardTimeSeries } from '#hooks/api/use-dashboard-trends'
import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { useEffect, useState } from 'react'

export function TrendsSection() {
  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    const supabase = getSupabaseClientInstance()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id)
    })
  }, [])

  // Fetch all trend data
  const { data: trends, isLoading } = useDashboardTrendData(userId)

  // Fetch time series for charts
  const { data: occupancyTimeSeries, isLoading: isOccupancyLoading } = useDashboardTimeSeries(
    userId,
    { metric: 'occupancy_rate', days: 30 }
  )
  const { data: revenueTimeSeries, isLoading: isRevenueLoading } = useDashboardTimeSeries(
    userId,
    { metric: 'monthly_revenue', days: 30 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Trends & Performance</h2>
        <p className="text-sm text-muted-foreground">
          30-day comparison with previous period
        </p>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendCard
          title="Occupancy Rate"
          metric={trends?.occupancyRate}
          isLoading={isLoading}
          valueFormatter={(v) => `${v.toFixed(1)}%`}
        />
        <TrendCard
          title="Active Tenants"
          metric={trends?.activeTenants}
          isLoading={isLoading}
          valueFormatter={(v) => v.toString()}
        />
        <TrendCard
          title="Monthly Revenue"
          metric={trends?.monthlyRevenue}
          isLoading={isLoading}
          valueFormatter={(v) => `$${(v / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <TrendCard
          title="Open Maintenance"
          metric={trends?.openMaintenance}
          isLoading={isLoading}
          valueFormatter={(v) => v.toString()}
        />
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          valueFormatter={(v) => `$${(v / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          color="hsl(142, 71%, 45%)" // Green for revenue
        />
      </div>
    </div>
  )
}
