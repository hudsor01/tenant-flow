/**
 * Reports API Client
 * Phase 5: Advanced Features - Custom Reports & Analytics
 */

import { API_BASE_URL } from '#lib/api-config'

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
		propertyId: string
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
	const res = await fetch(
		`${API_BASE_URL}/api/v1/reports/analytics/revenue/monthly?months=${months}`,
		{ credentials: 'include' }
	)
	if (!res.ok) throw new Error('Failed to fetch monthly revenue')
	const response = await res.json() as { success: boolean; data: RevenueData[] }
	return response.data
}

/**
 * Get payment analytics for dashboard
 */
export async function getPaymentAnalytics(
	startDate?: string,
	endDate?: string
): Promise<PaymentAnalytics> {
	const params = new URLSearchParams()
	if (startDate) params.append('startDate', startDate)
	if (endDate) params.append('endDate', endDate)

	const queryString = params.toString() ? `?${params.toString()}` : ''
	const res = await fetch(
		`${API_BASE_URL}/api/v1/reports/analytics/payments${queryString}`,
		{ credentials: 'include' }
	)
	if (!res.ok) throw new Error('Failed to fetch payment analytics')
	const response = await res.json() as { success: boolean; data: PaymentAnalytics }
	return response.data
}

/**
 * Get occupancy metrics across all properties
 */
export async function getOccupancyMetrics(): Promise<OccupancyMetrics> {
	const res = await fetch(
		`${API_BASE_URL}/api/v1/reports/analytics/occupancy`,
		{ credentials: 'include' }
	)
	if (!res.ok) throw new Error('Failed to fetch occupancy metrics')
	const response = await res.json() as { success: boolean; data: OccupancyMetrics }
	return response.data
}
