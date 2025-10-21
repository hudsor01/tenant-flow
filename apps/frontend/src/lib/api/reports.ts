/**
 * Reports API Client
 * Phase 5: Advanced Features - Custom Reports & Analytics
 */

import { API_BASE_URL } from '@/lib/api-client'
import { apiClient } from '@repo/shared/utils/api-client'

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
	const response = await apiClient<{ success: boolean; data: RevenueData[] }>(
		`${API_BASE_URL}/api/v1/reports/analytics/revenue/monthly?months=${months}`
	)
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
	const response = await apiClient<{
		success: boolean
		data: PaymentAnalytics
	}>(`${API_BASE_URL}/api/v1/reports/analytics/payments${queryString}`)
	return response.data
}

/**
 * Get occupancy metrics across all properties
 */
export async function getOccupancyMetrics(): Promise<OccupancyMetrics> {
	const response = await apiClient<{
		success: boolean
		data: OccupancyMetrics
	}>(`${API_BASE_URL}/api/v1/reports/analytics/occupancy`)
	return response.data
}
