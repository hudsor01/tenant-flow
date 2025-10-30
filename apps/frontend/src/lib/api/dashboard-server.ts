/**
 * Server-side dashboard API functions
 * Mirrors the existing dashboardApi structure for consistency
 */
import { serverFetch } from '#lib/api/server'
import type {
	DashboardStats,
	LeaseStatsResponse,
	MaintenanceRequestResponse,
	PropertyPerformance,
	SystemUptime,
	TenantStats,
	TenantWithLeaseInfo
} from '@repo/shared/types/core'
import type { PropertyWithUnits } from '@repo/shared/types/relations'
import type { Database } from '@repo/shared/types/supabase-generated'

/**
 * Dashboard API endpoints - server-side versions
 */
export const dashboardServerApi = {
	// Core dashboard stats
	getStats: () => serverFetch<DashboardStats>('/api/v1/manage/stats'),

	// Activity feed
	getActivity: () =>
		serverFetch<{ activities: Array<unknown> }>('/api/v1/manage/activity'),

	// Property performance metrics
	getPropertyPerformance: () =>
		serverFetch<PropertyPerformance[]>(
			'/api/v1/manage/property-performance'
		),

	// System uptime
	getUptime: () => serverFetch<SystemUptime>('/api/v1/manage/uptime'),

	// Maintenance statistics
	getMaintenanceStats: () =>
		serverFetch<{
			open: number
			inProgress: number
			completedToday: number
			avgResolutionTime: number
		}>('/api/v1/manage/maintenance-analytics')
}

/**
 * Parallel fetch all dashboard data for optimal performance
 */
export async function getAllDashboardData() {
	const [stats, activity] = await Promise.all([
		dashboardServerApi.getStats(),
		dashboardServerApi.getActivity()
	])

	return {
		stats,
		activity
	}
}

/**
 * Financial dashboard data
 */
export async function getFinancialDashboardData() {
	const financialStats = await serverFetch<{
		totalRevenue: number
		totalExpenses: number
		netIncome: number
		propertyCount: number
		occupancyRate: number
		avgRoi: number
	}>('/api/v1/financial/analytics/dashboard-metrics')
	return financialStats
}

/**
 * Properties with analytics
 */
export async function getPropertiesWithAnalytics() {
	const properties = await serverFetch<PropertyWithUnits[]>(
		'/api/v1/properties/with-units'
	)
	return properties
}

/**
 * Tenants with analytics (uses base tenants endpoint)
 */
export async function getTenantsWithAnalytics() {
	const tenants = await serverFetch<TenantWithLeaseInfo[]>('/api/v1/tenants')
	return tenants
}

/**
 * Maintenance requests
 */
export async function getMaintenanceRequests(status?: string) {
	const endpoint = status
		? `/api/v1/maintenance?status=${encodeURIComponent(status)}`
		: '/api/v1/maintenance'

	const maintenance = await serverFetch<MaintenanceRequestResponse>(endpoint)
	return maintenance
}

/**
 * Lease statistics
 */
export async function getLeaseStats() {
	const leaseStats = await serverFetch<LeaseStatsResponse>(
		'/api/v1/leases/stats'
	)
	return leaseStats
}

export async function getMaintenanceStats() {
	try {
		return await dashboardServerApi.getMaintenanceStats()
	} catch {
		return {
			open: 0,
			inProgress: 0,
			completedToday: 0,
			avgResolutionTime: 0
		}
	}
}

/**
 * Analytics page data - parallel fetch with error handling
 */
export async function getAnalyticsPageData() {
	const [
		dashboardStatsResult,
		propertyPerformanceResult,
		financialStatsResult
	] = await Promise.allSettled([
		dashboardServerApi.getStats(),
		dashboardServerApi.getPropertyPerformance(),
		getFinancialDashboardData()
	])

	// Extract values with fallbacks for failed requests
	const dashboardStats =
		dashboardStatsResult.status === 'fulfilled'
			? dashboardStatsResult.value
			: {
					totalProperties: 0,
					totalTenants: 0,
					monthlyRevenue: 0,
					occupancyRate: 0,
					maintenanceRequests: 0,
					totalUnits: 0,
					totalRevenue: 0,
					revenue: { monthly: 0, yearly: 0, growth: 0 },
					units: { occupancyRate: 0, occupancyChange: 0 },
					maintenance: { open: 0 },
					properties: { total: 0 }
				}

	const propertyPerformance =
		propertyPerformanceResult.status === 'fulfilled'
			? propertyPerformanceResult.value || []
			: []

	const financialStats =
		financialStatsResult.status === 'fulfilled'
			? financialStatsResult.value
			: {
					totalRevenue: 0,
					totalExpenses: 0,
					netIncome: 0,
					propertyCount: 0,
					occupancyRate: 0,
					avgRoi: 0
				}

	return {
		dashboardStats,
		propertyPerformance,
		financialStats
	}
}

/**
 * Properties page data - parallel fetch WITH STATS
 * All calculations done by backend/database
 * PropertyWithUnits includes all unit metrics pre-calculated
 * Handles errors gracefully with fallback values
 */
export async function getPropertiesPageData(status?: string) {
	const endpoint = status
		? `/api/v1/properties?status=${encodeURIComponent(status)}`
		: '/api/v1/properties'

	// Fetch properties (with units embedded) AND pre-calculated stats
	// NO NEED to fetch units separately - PropertyWithUnits has everything
	const [propertiesResult, propertyStatsResult] = await Promise.allSettled([
		serverFetch<PropertyWithUnits[]>(endpoint),
		serverFetch<{
			totalProperties: number
			totalUnits: number
			occupiedUnits: number
			occupancyRate: number
			totalRevenue: number
			vacantUnits: number
			maintenanceUnits: number
		}>('/api/v1/properties/stats')
	])

	// Extract values with fallbacks for failed requests
	const properties =
		propertiesResult.status === 'fulfilled' ? propertiesResult.value || [] : []

	const stats =
		propertyStatsResult.status === 'fulfilled'
			? propertyStatsResult.value
			: {
					totalProperties: 0,
					totalUnits: 0,
					occupiedUnits: 0,
					occupancyRate: 0,
					totalRevenue: 0,
					vacantUnits: 0,
					maintenanceUnits: 0
				}

	return {
		properties,
		stats
	}
}

/**
 * Tenants page data - parallel fetch with stats
 */
export async function getTenantsPageData() {
	const [tenantsResult, tenantStatsResult, tenantSummaryResult] =
		await Promise.allSettled([
			serverFetch<TenantWithLeaseInfo[]>('/api/v1/tenants'),
			serverFetch<TenantStats>('/api/v1/tenants/stats'),
			serverFetch('/api/v1/tenants/summary')
		])

	const tenants =
		tenantsResult.status === 'fulfilled' ? tenantsResult.value || [] : []

	const defaultTenantStats = {
		totalTenants: 0,
		activeTenants: 0,
		currentPayments: 0,
		latePayments: 0,
		totalRent: 0,
		avgRent: 0,
		recentAdditions: 0,
		withContactInfo: 0
	}

	const stats =
		tenantStatsResult.status === 'fulfilled' && tenantStatsResult.value
			? tenantStatsResult.value
			: defaultTenantStats

	const summary =
		tenantSummaryResult.status === 'fulfilled' && tenantSummaryResult.value
			? tenantSummaryResult.value
			: {
					total: 0,
					invited: 0,
					active: 0,
					overdueBalanceCents: 0,
					upcomingDueCents: 0,
					timestamp: new Date().toISOString()
				}

	return {
		tenants,
		stats,
		summary
	}
}

/**
 * Leases page data - parallel fetch with stats
 */
export async function getLeasesPageData() {
	const [leasesResult, leaseStatsResult] = await Promise.allSettled([
		serverFetch<Array<Database['public']['Tables']['lease']['Row']>>(
			'/api/v1/leases'
		),
		serverFetch<LeaseStatsResponse>('/api/v1/leases/stats')
	])

	// Extract values with fallbacks for failed requests
	const leases =
		leasesResult.status === 'fulfilled' ? leasesResult.value || [] : []
	const defaultLeaseStats: LeaseStatsResponse = {
		totalLeases: 0,
		activeLeases: 0,
		expiredLeases: 0,
		terminatedLeases: 0,
		totalMonthlyRent: 0,
		averageRent: 0,
		totalSecurityDeposits: 0,
		expiringLeases: 0
	}

	const stats =
		leaseStatsResult.status === 'fulfilled' && leaseStatsResult.value
			? leaseStatsResult.value
			: defaultLeaseStats

	return {
		leases,
		stats
	}
}

/**
 * Maintenance page data - parallel fetch with stats
 */
export async function getMaintenancePageData() {
	const [
		maintenanceResult,
		maintenanceStatsResult,
		maintenanceAnalyticsResult
	] = await Promise.allSettled([
		serverFetch<MaintenanceRequestResponse>('/api/v1/maintenance'),
		serverFetch<{
			open: number
			inProgress: number
			totalCost: number
			avgResponseTimeHours: number
		}>('/api/v1/maintenance/stats'),
		getMaintenanceStats()
	])

	const maintenanceItems =
		maintenanceResult.status === 'fulfilled' && maintenanceResult.value?.data
			? maintenanceResult.value.data
			: []

	const defaultCoreStats = {
		open: 0,
		inProgress: 0,
		totalCost: 0,
		avgResponseTimeHours: 0
	}

	const coreStats =
		maintenanceStatsResult.status === 'fulfilled' &&
		maintenanceStatsResult.value
			? maintenanceStatsResult.value
			: defaultCoreStats

	const defaultAnalyticsStats = {
		open: 0,
		inProgress: 0,
		completedToday: 0,
		avgResolutionTime: 0
	}

	const analyticsStats =
		maintenanceAnalyticsResult.status === 'fulfilled' &&
		maintenanceAnalyticsResult.value
			? maintenanceAnalyticsResult.value
			: defaultAnalyticsStats

	const avgResolutionTime = Number.isFinite(analyticsStats.avgResolutionTime)
		? (analyticsStats.avgResolutionTime as number)
		: 0

	return {
		data: maintenanceItems,
		stats: {
			open: analyticsStats.open ?? coreStats.open ?? 0,
			inProgress: analyticsStats.inProgress ?? coreStats.inProgress ?? 0,
			totalCost: coreStats.totalCost ?? 0,
			avgResponseTimeHours:
				avgResolutionTime > 0
					? avgResolutionTime
					: (coreStats.avgResponseTimeHours ?? 0),
			completedToday: analyticsStats.completedToday ?? 0
		}
	}
}

/**
 * Main dashboard page data - comprehensive overview
 * Handles errors gracefully with fallback values
 */
export async function getDashboardPageData() {
	// Fetch data with error handling for each request
	const [
		dashboardStatsResult,
		propertyStatsResult,
		tenantStatsResult,
		leaseStatsResult,
		recentActivityResult
	] = await Promise.allSettled([
		dashboardServerApi.getStats(),
		serverFetch<{
			totalProperties: number
			totalUnits: number
			occupiedUnits: number
			occupancyRate: number
			totalRevenue: number
			vacantUnits: number
			maintenanceUnits: number
		}>('/api/v1/properties/stats'),
		serverFetch<TenantStats>('/api/v1/tenants/stats'),
		getLeaseStats(),
		dashboardServerApi.getActivity()
	])

	// Extract values with fallbacks for failed requests
	const dashboardStats =
		dashboardStatsResult.status === 'fulfilled'
			? dashboardStatsResult.value
			: {
					totalProperties: 0,
					totalTenants: 0,
					monthlyRevenue: 0,
					occupancyRate: 0,
					maintenanceRequests: 0,
					totalUnits: 0,
					totalRevenue: 0,
					revenue: { monthly: 0 },
					maintenance: { open: 0 }
				}

	const propertyStats =
		propertyStatsResult.status === 'fulfilled'
			? propertyStatsResult.value
			: {
					totalProperties: 0,
					totalUnits: 0,
					occupiedUnits: 0,
					occupancyRate: 0,
					totalRevenue: 0,
					vacantUnits: 0,
					maintenanceUnits: 0
				}

	const tenantStats =
		tenantStatsResult.status === 'fulfilled'
			? tenantStatsResult.value
			: {
					totalTenants: 0,
					activeTenants: 0,
					currentPayments: 0,
					latePayments: 0,
					totalRent: 0,
					avgRent: 0,
					recentAdditions: 0,
					withContactInfo: 0
				}

	const leaseStats =
		leaseStatsResult.status === 'fulfilled' && leaseStatsResult.value
			? leaseStatsResult.value
			: {
					totalLeases: 0,
					activeLeases: 0,
					expiredLeases: 0,
					terminatedLeases: 0,
					totalMonthlyRent: 0,
					averageRent: 0,
					totalSecurityDeposits: 0,
					expiringLeases: 0
				}

	const recentActivity =
		recentActivityResult.status === 'fulfilled'
			? recentActivityResult.value
			: { activities: [] }

	return {
		dashboardStats,
		propertyStats,
		tenantStats,
		leaseStats,
		recentActivity
	}
}
