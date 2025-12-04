/**
 * Reports Query Options
 * Uses native fetch for NestJS calls.
 */

import { queryOptions } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import type { ListReportsResponse, RevenueData, PaymentAnalytics, OccupancyMetrics } from '@repo/shared/types/reports'

/**
 * Query keys for reports
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
	list: (offset: number, limit: number = 20) =>
		queryOptions({
			queryKey: reportsKeys.list(offset, limit),
			queryFn: () => apiRequest<ListReportsResponse>(`/api/v1/reports?limit=${limit}&offset=${offset}`)
		}),

	monthlyRevenue: (months: number = 12) =>
		queryOptions({
			queryKey: reportsKeys.revenue(months),
			queryFn: () => apiRequest<RevenueData[]>(`/api/v1/reports/analytics/revenue/monthly?months=${months}`)
		}),

	paymentAnalytics: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportsKeys.paymentAnalytics(start_date, end_date),
			queryFn: () => {
				const params = new URLSearchParams()
				if (start_date) params.append('start_date', start_date)
				if (end_date) params.append('end_date', end_date)
				const queryString = params.toString() ? `?${params.toString()}` : ''
				return apiRequest<PaymentAnalytics>(`/api/v1/reports/analytics/payments${queryString}`)
			}
		}),

	occupancyMetrics: () =>
		queryOptions({
			queryKey: reportsKeys.occupancyMetrics(),
			queryFn: () => apiRequest<OccupancyMetrics>('/api/v1/reports/analytics/occupancy')
		})
}
