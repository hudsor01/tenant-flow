/**
 * Reports API Client
 * Phase 5: Advanced Features - Custom Reports & Analytics
 */

import { clientFetch } from '#lib/api/client'

export interface RevenueData {
	month: string
	revenue: number
	expenses: number
	profit: number
	propertyCount: number
	unitCount: number
	occupiedUnits: number
}

export interface PaymentAnalytics {
	totalPayments: number
	successfulPayments: number
	failedPayments: number
	totalRevenue: number
	averagePayment: number
	paymentsByMethod: {
		card: number
		ach: number
	}
	paymentsByStatus: {
		completed: number
		pending: number
		failed: number
	}
}

export interface OccupancyMetrics {
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	byProperty: Array<{
		property_id: string
		propertyName: string
		totalUnits: number
		occupiedUnits: number
		occupancyRate: number
	}>
}

/**
 * Get monthly revenue data for charts
 */
export async function getMonthlyRevenue(
	months: number = 12
): Promise<RevenueData[]> {
	return clientFetch<RevenueData[]>(
		`/api/v1/reports/analytics/revenue/monthly?months=${months}`
	)
}

/**
 * Get payment analytics for dashboard
 */
export async function getPaymentAnalytics(
	start_date?: string,
	end_date?: string
): Promise<PaymentAnalytics> {
	const params = new URLSearchParams()
	if (start_date) params.append('start_date', start_date)
	if (end_date) params.append('end_date', end_date)

	const queryString = params.toString() ? `?${params.toString()}` : ''
	return clientFetch<PaymentAnalytics>(
		`/api/v1/reports/analytics/payments${queryString}`
	)
}

/**
 * Get occupancy metrics across all properties
 */
export async function getOccupancyMetrics(): Promise<OccupancyMetrics> {
	return clientFetch<OccupancyMetrics>(
		'/api/v1/reports/analytics/occupancy'
	)
}
