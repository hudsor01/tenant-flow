'use client'

/**
 * Dashboard Trends Hooks (modern /owner routes)
 *
 * Maintains the legacy hook names while delegating to the new owner dashboard
 * implementations so callers can migrate incrementally without hitting
 */

import { useQuery } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	useOwnerMetricTrend,
	useOwnerTimeSeries,
	ownerDashboardKeys
} from '#hooks/api/use-owner-dashboard'
import type {
	MetricTrend,
	DashboardTimeSeriesOptions
} from '@repo/shared/types/dashboard-repository'
import { clientFetch } from '#lib/api/client'

export const dashboardTrendKeys = {
	all: () => ownerDashboardKeys.reports.all(),
	metricTrend: (metric: string, period: string) =>
		ownerDashboardKeys.reports.metricTrend(metric, period),
	timeSeries: (metric: string, days: number) =>
		ownerDashboardKeys.reports.timeSeries(metric, days),
	trendData: () => [...ownerDashboardKeys.reports.all(), 'trend-data'] as const
}

export const useMetricTrend = (
	_user_id: string | undefined,
	metric: string,
	period: 'day' | 'week' | 'month' | 'year' = 'month'
) => useOwnerMetricTrend(metric, period)

export const useDashboardTimeSeries = (
	_user_id: string | undefined,
	options: DashboardTimeSeriesOptions
) => useOwnerTimeSeries(options)

export function useDashboardTrendData(_user_id?: string) {
	return useQuery({
		queryKey: dashboardTrendKeys.trendData(),
		queryFn: async (): Promise<{
			occupancyRate: MetricTrend
			activeTenants: MetricTrend
			monthlyRevenue: MetricTrend
			openMaintenance: MetricTrend
		}> => {
			const [occupancyRate, activeTenants, monthlyRevenue, openMaintenance] =
				await Promise.all([
					clientFetch<MetricTrend>(
						'/api/v1/owner/reports/metric-trend?metric=occupancy_rate&period=month'
					),
					clientFetch<MetricTrend>(
						'/api/v1/owner/reports/metric-trend?metric=active_tenants&period=month'
					),
					clientFetch<MetricTrend>(
						'/api/v1/owner/reports/metric-trend?metric=monthly_revenue&period=month'
					),
					clientFetch<MetricTrend>(
						'/api/v1/owner/reports/metric-trend?metric=open_maintenance&period=month'
					)
				])

			return {
				occupancyRate,
				activeTenants,
				monthlyRevenue,
				openMaintenance
			}
		},
		...QUERY_CACHE_TIMES.DETAIL,
		gcTime: 10 * 60 * 1000
	})
}
