/**
 * Frontend API client configuration for TenantFlow
 * Integrates with shared API client and backend endpoints
 */
import type {
	DashboardFinancialStats,
	DashboardStats,
	ExpenseSummaryResponse,
	LeaseStatsResponse,
	MaintenanceRequest,
	MaintenanceRequestResponse,
	MaintenanceStats,
	PropertyPerformance,
	PropertyStats,
	SystemUptime,
	TenantStats,
	TenantWithLeaseInfo
} from '@repo/shared/types/core'

import type { PropertyWithUnits } from '@repo/shared/types/relations'
import type {
	Tables,
	TablesInsert,
	TablesUpdate
} from '@repo/shared/types/supabase'
import { apiClient } from '@repo/shared/utils/api-client'
import type {
	MaintenanceRequestInput,
	MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'

// Use native Supabase table types for API operations
type Activity = Tables<'activity'>
type Lease = Tables<'lease'>
type Property = Tables<'property'>
type Unit = Tables<'unit'>

type LeaseInsert = TablesInsert<'lease'>
type LeaseUpdate = TablesUpdate<'lease'>
type PropertyInsert = TablesInsert<'property'>
type PropertyUpdate = TablesUpdate<'property'>
type TenantInsert = TablesInsert<'tenant'>
type TenantUpdate = TablesUpdate<'tenant'>
type UnitInsert = TablesInsert<'unit'>
type UnitUpdate = TablesUpdate<'unit'>

// API Base URL Configuration
// In production, environment variables are required for proper deployment
// In development, falls back to local backend port
function getApiBaseUrl(): string {
	return (
		process.env.NEXT_PUBLIC_API_BASE_URL ||
		(() => {
			throw new Error(
				'NEXT_PUBLIC_API_BASE_URL is required for API client configuration'
			)
		})()
	)
}

export const API_BASE_URL = getApiBaseUrl()

/**
 * Dashboard API endpoints
 */
export const dashboardApi = {
	getStats: (): Promise<DashboardStats> =>
		apiClient<DashboardStats>(`${API_BASE_URL}/api/v1/dashboard/stats`),

	getActivity: (): Promise<{ activities: Activity[] }> =>
		apiClient(`${API_BASE_URL}/api/v1/dashboard/activity`),

	getPropertyPerformance: (): Promise<PropertyPerformance[]> =>
		apiClient<PropertyPerformance[]>(
			`${API_BASE_URL}/api/v1/dashboard/property-performance`
		),

	getUptime: (): Promise<SystemUptime> =>
		apiClient<SystemUptime>(`${API_BASE_URL}/api/v1/dashboard/uptime`),

	// Optimized analytics endpoints using new RPC functions
	getOccupancyTrends: (months: number = 12) =>
		apiClient<
			Array<{
				month: string
				occupancy_rate: number
				total_units: number
				occupied_units: number
			}>
		>(`${API_BASE_URL}/api/v1/dashboard/occupancy-trends?months=${months}`),

	getRevenueTrends: (months: number = 12) =>
		apiClient<
			Array<{
				month: string
				revenue: number
				growth: number
				previous_period_revenue: number
			}>
		>(`${API_BASE_URL}/api/v1/dashboard/revenue-trends?months=${months}`),

	getMaintenanceAnalytics: () =>
		apiClient<ExpenseSummaryResponse>(
			`${API_BASE_URL}/api/v1/financial/analytics/expense-breakdown` // year param handled elsewhere if needed
		),

	getDashboardStats: (): Promise<DashboardFinancialStats> =>
		apiClient<DashboardFinancialStats>(
			`${API_BASE_URL}/api/v1/financial/analytics/dashboard-metrics`
		),

	getDashboardFinancialStatsCalculated: (): Promise<DashboardFinancialStats> =>
		apiClient<DashboardFinancialStats>(
			`${API_BASE_URL}/api/v1/financial/analytics/dashboard-metrics`
		)
}

// Resource APIs
export const propertiesApi = {
	list: (params?: { status?: string }) =>
		apiClient<Property[]>(
			`${API_BASE_URL}/api/v1/properties${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`
		),

	// Returns properties with units and pre-calculated analytics
	getPropertiesWithAnalytics: () =>
		apiClient<PropertyWithUnits[]>(
			`${API_BASE_URL}/api/v1/properties/with-units`
		),

	// Get real property statistics from database calculations
	getStats: () =>
		apiClient<PropertyStats>(`${API_BASE_URL}/api/v1/properties/stats`),

	get: (id: string) =>
		apiClient<Property>(`${API_BASE_URL}/api/v1/properties/${id}`),

	create: (body: PropertyInsert) =>
		apiClient<Property>(`${API_BASE_URL}/api/v1/properties`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	update: (id: string, body: PropertyUpdate) =>
		apiClient<Property>(`${API_BASE_URL}/api/v1/properties/${id}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		}),

	remove: (id: string) =>
		apiClient<void>(`${API_BASE_URL}/api/v1/properties/${id}`, {
			method: 'DELETE'
		})
}

export { apiClient }

export const unitsApi = {
	list: (params?: { status?: string }) =>
		apiClient<Unit[]>(
			`${API_BASE_URL}/api/v1/units${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`
		),
	stats: () =>
		apiClient<{
			totalUnits: number
			vacantUnits: number
			occupiedUnits: number
			maintenanceUnits: number
			reservedUnits: number
			occupancyRate: number
		}>(`${API_BASE_URL}/api/v1/units/stats`),
	create: (body: UnitInsert) =>
		apiClient<Unit>(`${API_BASE_URL}/api/v1/units`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),
	update: (id: string, body: UnitUpdate) =>
		apiClient<Unit>(`${API_BASE_URL}/api/v1/units/${id}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		}),
	remove: (id: string) =>
		apiClient<void>(`${API_BASE_URL}/api/v1/units/${id}`, { method: 'DELETE' })
}

export const tenantsApi = {
	list: (params?: { status?: string }) =>
		apiClient<TenantWithLeaseInfo[]>(
			`${API_BASE_URL}/api/v1/tenants${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`
		),
	get: (id: string) =>
		apiClient<TenantWithLeaseInfo>(`${API_BASE_URL}/api/v1/tenants/${id}`),

	getTenantsWithAnalytics: () =>
		apiClient<TenantWithLeaseInfo[]>(
			`${API_BASE_URL}/api/v1/tenants/analytics`
		),

	stats: () => apiClient<TenantStats>(`${API_BASE_URL}/api/v1/tenants/stats`),
	create: (body: TenantInsert) =>
		apiClient<TenantWithLeaseInfo>(`${API_BASE_URL}/api/v1/tenants`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),
	update: (id: string, body: TenantUpdate) =>
		apiClient<TenantWithLeaseInfo>(`${API_BASE_URL}/api/v1/tenants/${id}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		}),
	remove: (id: string) =>
		apiClient<void>(`${API_BASE_URL}/api/v1/tenants/${id}`, {
			method: 'DELETE'
		})
}

export const leasesApi = {
	list: (params?: { status?: string }) =>
		apiClient<Lease[]>(
			`${API_BASE_URL}/api/v1/leases${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`
		),

	get: (id: string) => apiClient<Lease>(`${API_BASE_URL}/api/v1/leases/${id}`),

	getLeasesWithAnalytics: (status?: string) =>
		apiClient<Lease[]>(
			`${API_BASE_URL}/api/v1/leases/analytics${status ? `?status=${encodeURIComponent(status)}` : ''}`
		),

	getLeaseFinancialSummary: (): Promise<LeaseStatsResponse> =>
		apiClient<LeaseStatsResponse>(
			`${API_BASE_URL}/api/v1/leases/financial-summary`
		),

	createLeaseWithFinancialCalculations: (body: LeaseInsert) =>
		apiClient<Lease>(`${API_BASE_URL}/api/v1/leases/create-calculated`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	updateLeaseWithFinancialCalculations: (id: string, body: LeaseUpdate) =>
		apiClient<Lease>(`${API_BASE_URL}/api/v1/leases/${id}/update-calculated`, {
			method: 'PUT',
			body: JSON.stringify(body)
		}),

	terminateLeaseWithFinancialCalculations: (id: string) =>
		apiClient<void>(
			`${API_BASE_URL}/api/v1/leases/${id}/terminate-calculated`,
			{
				method: 'PUT'
			}
		),

	stats: (): Promise<LeaseStatsResponse> =>
		apiClient<LeaseStatsResponse>(`${API_BASE_URL}/api/v1/leases/stats`),
	create: (body: LeaseInsert) =>
		apiClient<Lease>(`${API_BASE_URL}/api/v1/leases`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),
	update: (id: string, body: LeaseUpdate) =>
		apiClient<Lease>(`${API_BASE_URL}/api/v1/leases/${id}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		}),
	remove: (id: string) =>
		apiClient<void>(`${API_BASE_URL}/api/v1/leases/${id}`, { method: 'DELETE' })
}

export const maintenanceApi = {
	list: (params?: { status?: string }) =>
		apiClient<MaintenanceRequestResponse>(
			`${API_BASE_URL}/api/v1/maintenance${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`
		),
	get: (id: string) =>
		apiClient<MaintenanceRequest>(`${API_BASE_URL}/api/v1/maintenance/${id}`),
	create: (body: MaintenanceRequestInput) =>
		apiClient<MaintenanceRequest>(`${API_BASE_URL}/api/v1/maintenance`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),
	update: (id: string, body: MaintenanceRequestUpdate) =>
		apiClient<MaintenanceRequest>(`${API_BASE_URL}/api/v1/maintenance/${id}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		}),
	remove: (id: string) =>
		apiClient<void>(`${API_BASE_URL}/api/v1/maintenance/${id}`, {
			method: 'DELETE'
		}),
	complete: (id: string, actualCost?: number, notes?: string) =>
		apiClient<MaintenanceRequest>(
			`${API_BASE_URL}/api/v1/maintenance/${id}/complete`,
			{
				method: 'POST',
				body: JSON.stringify({ actualCost, notes })
			}
		),
	cancel: (id: string, reason?: string) =>
		apiClient<MaintenanceRequest>(
			`${API_BASE_URL}/api/v1/maintenance/${id}/cancel`,
			{
				method: 'POST',
				body: JSON.stringify({ reason })
			}
		),
	stats: () =>
		apiClient<MaintenanceStats>(`${API_BASE_URL}/api/v1/maintenance/stats`),

	// New analytics endpoints using PostgreSQL RPC functions
	analytics: {
		getMetrics: (propertyId?: string, timeframe = '30d', status?: string) => {
			const params = new URLSearchParams()
			if (propertyId) params.set('propertyId', propertyId)
			params.set('timeframe', timeframe)
			if (status) params.set('status', status)

			return apiClient(
				`${API_BASE_URL}/api/v1/maintenance/analytics/metrics?${params}`
			)
		},

		getCostSummary: (propertyId?: string, timeframe = '30d') => {
			const params = new URLSearchParams()
			if (propertyId) params.set('propertyId', propertyId)
			params.set('timeframe', timeframe)

			return apiClient(
				`${API_BASE_URL}/api/v1/maintenance/analytics/cost-summary?${params}`
			)
		},

		getPerformance: (propertyId?: string, period = 'monthly') => {
			const params = new URLSearchParams()
			if (propertyId) params.set('propertyId', propertyId)
			params.set('period', period)

			return apiClient(
				`${API_BASE_URL}/api/v1/maintenance/analytics/performance?${params}`
			)
		}
	}
}

/**
 * Stripe API endpoints
 * Fetches live pricing data from Stripe SDK via backend
 */
export const stripeApi = {
	getProducts: () =>
		apiClient<{
			success: boolean
			products: Array<{
				id: string
				name: string
				description: string | null
				active: boolean
				metadata: Record<string, string>
				default_price?: {
					id: string
					unit_amount: number
					currency: string
					recurring: {
						interval: 'month' | 'year'
						interval_count: number
					} | null
				}
				prices?: Array<{
					id: string
					unit_amount: number
					currency: string
					recurring: {
						interval: 'month' | 'year'
						interval_count: number
					} | null
				}>
			}>
		}>(`${API_BASE_URL}/api/v1/stripe/products`),

	getPrices: () =>
		apiClient<{
			success: boolean
			prices: Array<{
				id: string
				product: string
				unit_amount: number
				currency: string
				recurring: {
					interval: 'month' | 'year'
					interval_count: number
				} | null
				active: boolean
			}>
		}>(`${API_BASE_URL}/api/v1/stripe/prices`)
}

/**
 * Visitor Analytics API endpoints - REMOVED
 * These endpoints do not exist in the backend and were causing 400/404 errors
 * Visitor analytics endpoints can be registered here once the backend exposes them.
 */
// export const visitorAnalyticsApi = {
// 	getPropertyInterest: (timeRange = '30d', propertyId?: string) => {
// 		const params = new URLSearchParams()
// 		params.set('timeRange', timeRange)
// 		if (propertyId) params.set('propertyId', propertyId)
//
// 		return apiClient(
// 			`${API_BASE_URL}/api/v1/analytics/visitor/property-interest?${params}`
// 		)
// 	},
//
// 	getInquiryMetrics: (timeRange = '30d', propertyId?: string) => {
// 		const params = new URLSearchParams()
// 		params.set('timeRange', timeRange)
// 		if (propertyId) params.set('propertyId', propertyId)
//
// 		return apiClient(
// 			`${API_BASE_URL}/api/v1/analytics/visitor/inquiry-metrics?${params}`
// 		)
// 	},
//
// 	getViewingMetrics: (timeRange = '30d', propertyId?: string) => {
// 		const params = new URLSearchParams()
// 		params.set('timeRange', timeRange)
// 		if (propertyId) params.set('propertyId', propertyId)
//
// 		return apiClient(
// 			`${API_BASE_URL}/api/v1/analytics/visitor/viewing-metrics?${params}`
// 		)
// 	},
//
// 	getComparativeAnalytics: (currentPeriod = '30d', previousPeriod = '30d') => {
// 		const params = new URLSearchParams()
// 		params.set('currentPeriod', currentPeriod)
// 		params.set('previousPeriod', previousPeriod)
//
// 		return apiClient(`${API_BASE_URL}/api/v1/analytics/visitor/comparative?${params}`)
// 	}
// }

// Note: Authentication is handled directly via Supabase Auth
// See use-supabase-auth.ts for all authentication operations
// No backend auth proxy needed - uses native Supabase client integration
