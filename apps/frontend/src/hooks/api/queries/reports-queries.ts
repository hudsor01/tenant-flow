/**
 * Reports Query Options
 * Centralized query configurations for reports API
 * TanStack Query v5 queryOptions pattern
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import type { ListReportsResponse, RevenueData, PaymentAnalytics, OccupancyMetrics } from '@repo/shared/types/reports'

/**
 * Query keys for reports
 * Hierarchical pattern for selective cache invalidation
 */
export const reportsKeys = {
	all: ['reports'] as const,
	lists: () => [...reportsKeys.all, 'list'] as const,
	list: (offset: number, limit: number) =>
		[...reportsKeys.lists(), offset, limit] as const,
	revenue: (months: number) =>
		[...reportsKeys.all, 'revenue', 'monthly', months] as const,
	paymentAnalytics: (start_date?: string, end_date?: string) =>
		[...reportsKeys.all, 'analytics', 'payments', start_date, end_date] as const,
	occupancyMetrics: () =>
		[...reportsKeys.all, 'analytics', 'occupancy'] as const
}

/**
 * Reports query options factory
 */
export const reportsQueries = {
	/**
	 * List reports with pagination
	 */
	list: (offset: number, limit: number = 20) =>
		queryOptions({
			queryKey: reportsKeys.list(offset, limit),
			queryFn: async (): Promise<ListReportsResponse> => {
				const queryParams = new URLSearchParams()
				queryParams.append('limit', limit.toString())
				queryParams.append('offset', offset.toString())
				return clientFetch<ListReportsResponse>(`/api/v1/reports?${queryParams.toString()}`)
			}
		}),

	/**
	 * Monthly revenue data
	 */
	monthlyRevenue: (months: number = 12) =>
		queryOptions({
			queryKey: reportsKeys.revenue(months),
			queryFn: () => clientFetch<RevenueData[]>(`/api/v1/reports/analytics/revenue/monthly?months=${months}`)
		}),

	/**
	 * Payment analytics
	 */
	paymentAnalytics: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportsKeys.paymentAnalytics(start_date, end_date),
			queryFn: (): Promise<PaymentAnalytics> => {
				const params = new URLSearchParams()
				if (start_date) params.append('start_date', start_date)
				if (end_date) params.append('end_date', end_date)
				const queryString = params.toString() ? `?${params.toString()}` : ''
				return clientFetch<PaymentAnalytics>(`/api/v1/reports/analytics/payments${queryString}`)
			}
		}),

	/**
	 * Occupancy metrics
	 */
	occupancyMetrics: () =>
		queryOptions({
			queryKey: reportsKeys.occupancyMetrics(),
			queryFn: () => clientFetch<OccupancyMetrics>('/api/v1/reports/analytics/occupancy')
		})
}
