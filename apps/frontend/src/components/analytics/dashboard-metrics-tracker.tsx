'use client'

import { useEffect, useRef } from 'react'
import { usePostHog } from '@/hooks/use-posthog'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  metricKey: string
}

export function MetricCard({ title, value, change, metricKey }: MetricCardProps) {
  const { trackEvent } = usePostHog()
  const hasTrackedView = useRef(false)

  useEffect(() => {
    // Track metric view only once per mount
    if (!hasTrackedView.current) {
      hasTrackedView.current = true
      trackEvent('dashboard_viewed', {
        metric_key: metricKey,
        metric_title: title,
        metric_value: value,
        metric_change: change,
      })
    }
  }, [trackEvent, metricKey, title, value, change])

  return (
    <div 
      className="bg-white rounded-lg shadow p-6"
      data-track={`metric-${metricKey}`}
    >
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {change && (
        <p className={`mt-2 text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
          {change} from last month
        </p>
      )}
    </div>
  )
}

interface DashboardMetricsProps {
  metrics: {
    totalProperties: number
    totalUnits: number
    totalTenants: number
    occupancyRate: number
    monthlyRevenue: number
    maintenanceRequests: number
  }
}

export function DashboardMetricsTracker({ metrics }: DashboardMetricsProps) {
  const { trackEvent, trackTiming } = usePostHog()
  const loadStartTime = useRef(Date.now())

  useEffect(() => {
    // Track dashboard load timing
    const loadTime = Date.now() - loadStartTime.current
    trackTiming('page', 'dashboard_load_time', loadTime, 'dashboard')

    // Track overall dashboard view with metrics summary
    trackEvent('dashboard_viewed', {
      page_type: 'main_dashboard',
      total_properties: metrics.totalProperties,
      total_units: metrics.totalUnits,
      total_tenants: metrics.totalTenants,
      occupancy_rate: metrics.occupancyRate,
      monthly_revenue: metrics.monthlyRevenue,
      maintenance_requests: metrics.maintenanceRequests,
      has_properties: metrics.totalProperties > 0,
      has_tenants: metrics.totalTenants > 0,
    })
  }, [trackEvent, trackTiming, metrics])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <MetricCard
        title="Total Properties"
        value={metrics.totalProperties}
        metricKey="total_properties"
      />
      <MetricCard
        title="Total Units"
        value={metrics.totalUnits}
        metricKey="total_units"
      />
      <MetricCard
        title="Total Tenants"
        value={metrics.totalTenants}
        metricKey="total_tenants"
      />
      <MetricCard
        title="Occupancy Rate"
        value={`${metrics.occupancyRate}%`}
        change={metrics.occupancyRate > 85 ? '+2.3%' : '-1.5%'}
        metricKey="occupancy_rate"
      />
      <MetricCard
        title="Monthly Revenue"
        value={`$${metrics.monthlyRevenue.toLocaleString()}`}
        change="+5.2%"
        metricKey="monthly_revenue"
      />
      <MetricCard
        title="Maintenance Requests"
        value={metrics.maintenanceRequests}
        change="-15%"
        metricKey="maintenance_requests"
      />
    </div>
  )
}