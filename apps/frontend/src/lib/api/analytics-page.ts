/**
 * Analytics Page Data Functions
 * Provides unified page data loading using the unified API client
 * Replaces analytics-server.ts and dashboard-server.ts cache() wrappers
 */
import { clientFetch } from '#lib/api/client'
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
	const [
		metrics,
		breakdown,
		netOperatingIncome,
		billingInsights,
		invoiceSummary,
		monthlyMetrics,
		leaseAnalytics
	] = await Promise.all([
		clientFetch('/financial/analytics/dashboard-metrics'),
		clientFetch('/financial/analytics/breakdown'),
		clientFetch('/financial/analytics/net-operating-income'),
		clientFetch('/financial/analytics/billing-insights'),
		clientFetch('/financial/analytics/invoice-summary'),
		clientFetch('/financial/analytics/monthly-metrics'),
		clientFetch('/financial/analytics/lease-analytics')
	])

	return {
		metrics: metrics as FinancialAnalyticsPageData['metrics'],
		breakdown: breakdown as FinancialAnalyticsPageData['breakdown'],
		netOperatingIncome: netOperatingIncome as FinancialAnalyticsPageData['netOperatingIncome'],
		billingInsights: billingInsights as FinancialAnalyticsPageData['billingInsights'],
		invoiceSummary: invoiceSummary as FinancialAnalyticsPageData['invoiceSummary'],
		monthlyMetrics: monthlyMetrics as FinancialAnalyticsPageData['monthlyMetrics'],
		leaseAnalytics: leaseAnalytics as FinancialAnalyticsPageData['leaseAnalytics']
	}
}

/**
 * Lease Analytics Page Data
 * Aggregates all lease analytics data for the lease analytics page
 */
export async function getLeaseAnalyticsPageData(): Promise<LeaseAnalyticsPageData> {
	const [
		metrics,
		profitability,
		renewalRates,
		vacancyTrends,
		leaseDistribution
	] = await Promise.all([
		clientFetch('/lease/analytics/metrics'),
		clientFetch('/lease/analytics/profitability'),
		clientFetch('/lease/analytics/renewal-rates'),
		clientFetch('/lease/analytics/vacancy-trends'),
		clientFetch('/lease/analytics/distribution')
	])

	return {
		metrics: metrics as LeaseAnalyticsPageData['metrics'],
		profitability: profitability as LeaseAnalyticsPageData['profitability'],
		renewalRates: renewalRates as LeaseAnalyticsPageData['renewalRates'],
		vacancyTrends: vacancyTrends as LeaseAnalyticsPageData['vacancyTrends'],
		leaseDistribution: leaseDistribution as LeaseAnalyticsPageData['leaseDistribution']
	}
}

/**
 * Maintenance Insights Page Data
 * Aggregates all maintenance analytics data for the maintenance insights page
 */
export async function getMaintenanceInsightsPageData(): Promise<MaintenanceInsightsPageData> {
	const [
		metrics,
		categoryBreakdown,
		costTrends,
		responseTimes,
		preventiveMaintenance
	] = await Promise.all([
		clientFetch('/maintenance/analytics/metrics'),
		clientFetch('/maintenance/analytics/category-breakdown'),
		clientFetch('/maintenance/analytics/cost-trends'),
		clientFetch('/maintenance/analytics/response-times'),
		clientFetch('/maintenance/analytics/preventive-maintenance')
	])

	return {
		metrics: metrics as MaintenanceInsightsPageData['metrics'],
		categoryBreakdown: categoryBreakdown as MaintenanceInsightsPageData['categoryBreakdown'],
		costTrends: costTrends as MaintenanceInsightsPageData['costTrends'],
		responseTimes: responseTimes as MaintenanceInsightsPageData['responseTimes'],
		preventiveMaintenance: preventiveMaintenance as MaintenanceInsightsPageData['preventiveMaintenance']
	}
}

/**
 * Occupancy Analytics Page Data
 * Aggregates all occupancy analytics data for the occupancy analytics page
 */
export async function getOccupancyAnalyticsPageData(): Promise<OccupancyAnalyticsPageData> {
	const [
		metrics,
		trends,
		propertyPerformance,
		seasonalPatterns,
		vacancyAnalysis
	] = await Promise.all([
		clientFetch('/occupancy/analytics/metrics'),
		clientFetch('/occupancy/analytics/trends'),
		clientFetch('/occupancy/analytics/property-performance'),
		clientFetch('/occupancy/analytics/seasonal-patterns'),
		clientFetch('/occupancy/analytics/vacancy-analysis')
	])

	return {
		metrics: metrics as OccupancyAnalyticsPageData['metrics'],
		trends: trends as OccupancyAnalyticsPageData['trends'],
		propertyPerformance: propertyPerformance as OccupancyAnalyticsPageData['propertyPerformance'],
		seasonalPatterns: seasonalPatterns as OccupancyAnalyticsPageData['seasonalPatterns'],
		vacancyAnalysis: vacancyAnalysis as OccupancyAnalyticsPageData['vacancyAnalysis']
	}
}

/**
 * Analytics Overview Page Data
 * Aggregates all analytics data for the analytics overview page
 */
export async function getAnalyticsPageData(): Promise<AnalyticsPageData> {
	const [
		financial,
		maintenance,
		occupancy,
		lease,
		visitor
	] = await Promise.all([
		clientFetch('/analytics/overview/financial'),
		clientFetch('/analytics/overview/maintenance'),
		clientFetch('/analytics/overview/occupancy'),
		clientFetch('/analytics/overview/lease'),
		clientFetch('/analytics/overview/visitor')
	])

	return {
		financial: financial as AnalyticsPageData['financial'],
		maintenance: maintenance as AnalyticsPageData['maintenance'],
		occupancy: occupancy as AnalyticsPageData['occupancy'],
		lease: lease as AnalyticsPageData['lease'],
		visitor: visitor as AnalyticsPageData['visitor']
	}
}

/**
 * Property Performance Page Data
 * Aggregates all property performance analytics data
 */
export async function getPropertyPerformancePageData(): Promise<PropertyPerformancePageData> {
	const [
		metrics,
		unitStats,
		performance,
		units,
		revenueTrends
	] = await Promise.all([
		clientFetch('/property/analytics/performance/metrics'),
		clientFetch('/property/analytics/performance/unit-stats'),
		clientFetch('/property/analytics/performance/data'),
		clientFetch('/property/analytics/performance/units'),
		clientFetch('/property/analytics/performance/revenue-trends')
	])

	return {
		metrics: metrics as PropertyPerformancePageData['metrics'],
		unitStats: unitStats as PropertyPerformancePageData['unitStats'],
		performance: performance as PropertyPerformancePageData['performance'],
		units: units as PropertyPerformancePageData['units'],
		revenueTrends: revenueTrends as PropertyPerformancePageData['revenueTrends']
	}
}

/**
 * Leases Page Data
 * Aggregates all lease data for the tenants page
 */
export async function getLeasesPageData(): Promise<LeasesPageData> {
	const [
		leases,
		tenants,
		properties,
		metrics
	] = await Promise.all([
		clientFetch('/leases'),
		clientFetch('/tenants'),
		clientFetch('/properties'),
		clientFetch('/leases/analytics/metrics')
	])

	return {
		leases: leases as LeasesPageData['leases'],
		tenants: tenants as LeasesPageData['tenants'],
		properties: properties as LeasesPageData['properties'],
		metrics: metrics as LeasesPageData['metrics']
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