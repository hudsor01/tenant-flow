/**
 * Frontend API client configuration for TenantFlow
 * Integrates with shared API client and backend endpoints
 */
import { apiClient } from '@repo/shared'
import type {
	DashboardFinancialStats,
	ExpenseSummaryResponse,
	FinancialOverviewResponse,
	LeaseStatsResponse,
	TenantStatsResponse,
	TenantWithLeaseInfo
} from '@repo/shared/types/common'
import type { DashboardStats } from '@repo/shared/types/stats'

import type {
	Tables,
	TablesInsert,
	TablesUpdate
} from '@repo/shared/types/supabase-generated'

// Use native Supabase table types for API operations
type Lease = Tables<'Lease'>
type Property = Tables<'Property'>
type Tenant = Tables<'Tenant'>
type Unit = Tables<'Unit'>

type LeaseInsert = TablesInsert<'Lease'>
type LeaseUpdate = TablesUpdate<'Lease'>
type PropertyInsert = TablesInsert<'Property'>
type PropertyUpdate = TablesUpdate<'Property'>
type TenantInsert = TablesInsert<'Tenant'>
type TenantUpdate = TablesUpdate<'Tenant'>
type UnitInsert = TablesInsert<'Unit'>
type UnitUpdate = TablesUpdate<'Unit'>

export const API_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4600'

/**
 * Dashboard API endpoints
 */
export const dashboardApi = {
	getStats: (): Promise<DashboardStats> =>
		apiClient<DashboardStats>(`${API_BASE_URL}/api/v1/dashboard/stats`),

	getActivity: (): Promise<{ activities: Array<unknown> }> =>
		apiClient(`${API_BASE_URL}/api/v1/dashboard/activity`)
}

/**
 * Financial API endpoints - all calculations done in database
 */
export const financialApi = {
	getOverview: (year?: number): Promise<FinancialOverviewResponse> =>
		apiClient<FinancialOverviewResponse>(
			`${API_BASE_URL}/api/v1/financial/overview${year ? `?year=${year}` : ''}`
		),

	getExpenseSummary: (year?: number): Promise<ExpenseSummaryResponse> =>
		apiClient<ExpenseSummaryResponse>(
			`${API_BASE_URL}/api/v1/financial/expenses${year ? `?year=${year}` : ''}`
		),

	getDashboardStats: (): Promise<DashboardFinancialStats> =>
		apiClient<DashboardFinancialStats>(
			`${API_BASE_URL}/api/v1/financial/dashboard-stats`
		)
}

/**
 * Export the base API client for direct use
 */
export { apiClient }

/**
 * Resource APIs
 */
export const propertiesApi = {
	list: (params?: { status?: string }) =>
		apiClient<Property[]>(
			`${API_BASE_URL}/api/v1/properties${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`
		),
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

export const unitsApi = {
	list: (params?: { status?: string }) =>
		apiClient<Unit[]>(
			`${API_BASE_URL}/api/v1/units${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`
		),
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
	stats: () =>
		apiClient<TenantStatsResponse>(`${API_BASE_URL}/api/v1/tenants/stats`),
	create: (body: TenantInsert) =>
		apiClient<Tenant>(`${API_BASE_URL}/api/v1/tenants`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),
	update: (id: string, body: TenantUpdate) =>
		apiClient<Tenant>(`${API_BASE_URL}/api/v1/tenants/${id}`, {
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
