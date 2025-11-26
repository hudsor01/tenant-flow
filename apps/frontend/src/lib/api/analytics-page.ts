/**
 * Analytics Page Data Functions
 * Provides unified page data loading using the unified API client
 * Replaces analytics-server.ts and dashboard-server.ts cache() wrappers
 */
import { serverFetch } from '#lib/api/server'
import type {
	FinancialAnalyticsPageData,
	LeaseAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
	AnalyticsPageData,
	PropertyPerformancePageData,
	LeasesPageData
} from '@repo/shared/types/analytics-page-data'

/**
 * Financial Analytics Page Data
 * Aggregates all financial analytics data for the financial analytics page
 */
export async function getFinancialAnalyticsPageData(): Promise<FinancialAnalyticsPageData> {
	// Single optimized endpoint - backend fetches all data in parallel via Promise.all
	const response = await serverFetch<{ data: FinancialAnalyticsPageData }>(
		'/api/v1/analytics/financial/page-data'
	)

	// Backend returns { success: true, data: {...} }
	return response.data ?? (response as unknown as FinancialAnalyticsPageData)
}

/**
 * Lease Analytics Page Data
 * Aggregates all lease analytics data for the lease analytics page
 */
export async function getLeaseAnalyticsPageData(): Promise<LeaseAnalyticsPageData> {
	// Single optimized endpoint - backend fetches all data in parallel via Promise.all
	const response = await serverFetch<{ data: LeaseAnalyticsPageData }>(
		'/api/v1/analytics/lease/page-data'
	)

	// Backend returns { success: true, data: {...} }
	return response.data ?? (response as unknown as LeaseAnalyticsPageData)
}

/**
 * Maintenance Insights Page Data
 * Aggregates all maintenance analytics data for the maintenance insights page
 */
export async function getMaintenanceInsightsPageData(): Promise<MaintenanceInsightsPageData> {
	// Single optimized endpoint - backend fetches all data in parallel via Promise.all
	const response = await serverFetch<{ data: MaintenanceInsightsPageData }>(
		'/api/v1/analytics/maintenance/page-data'
	)

	// Backend returns { success: true, data: {...} }
	return response.data ?? (response as unknown as MaintenanceInsightsPageData)
}

/**
 * Occupancy Analytics Page Data
 * Aggregates all occupancy analytics data for the occupancy analytics page
 */
export async function getOccupancyAnalyticsPageData(): Promise<OccupancyAnalyticsPageData> {
	// Occupancy data comes from owner/tenants endpoint
	const response = await serverFetch<{ data: OccupancyAnalyticsPageData }>(
		'/api/v1/owner/tenants/occupancy-trends'
	)

	// Backend returns { success: true, data: {...} }
	const data = response.data ?? (response as unknown as OccupancyAnalyticsPageData)

	return {
		metrics: data.metrics ?? { occupancyRate: 0, totalUnits: 0, occupiedUnits: 0, vacantUnits: 0 },
		trends: data.trends ?? [],
		propertyPerformance: data.propertyPerformance ?? [],
		seasonalPatterns: data.seasonalPatterns ?? [],
		vacancyAnalysis: data.vacancyAnalysis ?? { totalVacant: 0, avgVacancyDays: 0, vacancyByProperty: [] }
	}
}

/**
 * Analytics Overview Page Data
 * Aggregates all analytics data for the analytics overview page
 */
export async function getAnalyticsPageData(): Promise<AnalyticsPageData> {
	// Fetch overview data from individual page-data endpoints in parallel
	const [financial, maintenance, lease] = await Promise.all([
		serverFetch<{ data: unknown }>('/api/v1/analytics/financial/page-data'),
		serverFetch<{ data: unknown }>('/api/v1/analytics/maintenance/page-data'),
		serverFetch<{ data: unknown }>('/api/v1/analytics/lease/page-data')
	])

	return {
		financial: (financial.data ?? financial) as AnalyticsPageData['financial'],
		maintenance: (maintenance.data ?? maintenance) as AnalyticsPageData['maintenance'],
		occupancy: {} as AnalyticsPageData['occupancy'], // Loaded separately if needed
		lease: (lease.data ?? lease) as AnalyticsPageData['lease'],
		visitor: {} as AnalyticsPageData['visitor'] // Loaded separately if needed
	}
}

/**
 * Property Performance Page Data
 * Aggregates all property performance analytics data
 */
export async function getPropertyPerformancePageData(): Promise<PropertyPerformancePageData> {
	// Single optimized endpoint - backend fetches all data in parallel via Promise.all
	const response = await serverFetch<{ data: PropertyPerformancePageData }>(
		'/api/v1/analytics/property-performance/page-data'
	)

	// Backend returns { success: true, data: {...} }
	return response.data ?? (response as unknown as PropertyPerformancePageData)
}

/**
 * Leases Page Data
 * Aggregates all lease data for the tenants page
 */
export async function getLeasesPageData(): Promise<LeasesPageData> {
	// Fetch leases page data from individual endpoints in parallel
	const [leases, tenants, properties, metrics] = await Promise.all([
		serverFetch<{ data: unknown }>('/api/v1/leases'),
		serverFetch<{ data: unknown }>('/api/v1/tenants'),
		serverFetch<{ data: unknown }>('/api/v1/properties'),
		serverFetch<{ data: unknown }>('/api/v1/analytics/lease-analytics')
	])

	return {
		leases: (leases.data ?? leases) as LeasesPageData['leases'],
		tenants: (tenants.data ?? tenants) as LeasesPageData['tenants'],
		properties: (properties.data ?? properties) as LeasesPageData['properties'],
		metrics: (metrics.data ?? metrics) as LeasesPageData['metrics']
	}
}

// ============================================================================
// REPORTS & ANALYTICS - Granular Data Functions
// ============================================================================

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
	return serverFetch<RevenueData[]>(
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
	return serverFetch<PaymentAnalytics>(
		`/api/v1/reports/analytics/payments${queryString}`
	)
}

/**
 * Get occupancy metrics across all properties
 */
export async function getOccupancyMetrics(): Promise<OccupancyMetrics> {
	return serverFetch<OccupancyMetrics>(
		'/api/v1/reports/analytics/occupancy'
	)
}