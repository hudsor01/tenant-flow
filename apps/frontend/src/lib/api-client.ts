/**
 * Frontend API client configuration for TenantFlow
 * Integrates with shared API client and backend endpoints
 */
import { apiClient } from '@repo/shared/utils/api-client'
import type {
	DashboardFinancialStats,
	ExpenseSummaryResponse,
	FinancialOverviewResponse,
	LeaseStatsResponse,
	TenantWithLeaseInfo
} from '@repo/shared'
import type { DashboardStats, TenantStats } from '@repo/shared'

import type {
	Tables,
	TablesInsert,
	TablesUpdate
} from '@repo/shared'

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
 * Financial API endpoints - all calculations done in database via RPC functions
 */
export const financialApi = {
	getOverview: (year?: number): Promise<FinancialOverviewResponse> =>
		apiClient<FinancialOverviewResponse>(
			`${API_BASE_URL}/api/v1/financial/overview${year ? `?year=${year}` : ''}`
		),

	getOverviewWithCalculations: (year?: number): Promise<FinancialOverviewResponse> =>
		apiClient<FinancialOverviewResponse>(
			`${API_BASE_URL}/api/v1/financial/overview-calculated${year ? `?year=${year}` : ''}`
		),

	getExpenseSummary: (year?: number): Promise<ExpenseSummaryResponse> =>
		apiClient<ExpenseSummaryResponse>(
			`${API_BASE_URL}/api/v1/financial/expenses${year ? `?year=${year}` : ''}`
		),

	getExpenseSummaryWithPercentages: (year?: number): Promise<ExpenseSummaryResponse> =>
		apiClient<ExpenseSummaryResponse>(
			`${API_BASE_URL}/api/v1/financial/expenses-calculated${year ? `?year=${year}` : ''}`
		),

	getDashboardStats: (): Promise<DashboardFinancialStats> =>
		apiClient<DashboardFinancialStats>(
			`${API_BASE_URL}/api/v1/financial/dashboard-stats`
		),

	getDashboardFinancialStatsCalculated: (): Promise<DashboardFinancialStats> =>
		apiClient<DashboardFinancialStats>(
			`${API_BASE_URL}/api/v1/financial/dashboard-stats-calculated`
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
	
	getPropertiesWithAnalytics: () =>
		apiClient<Property[]>(`${API_BASE_URL}/api/v1/properties/analytics`),
	
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
	
	getTenantsWithAnalytics: () =>
		apiClient<TenantWithLeaseInfo[]>(`${API_BASE_URL}/api/v1/tenants/analytics`),
	
	stats: () => apiClient<TenantStats>(`${API_BASE_URL}/api/v1/tenants/stats`),
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
	
	getLeasesWithAnalytics: (status?: string) =>
		apiClient<Lease[]>(
			`${API_BASE_URL}/api/v1/leases/analytics${status ? `?status=${encodeURIComponent(status)}` : ''}`
		),
	
	getLeaseFinancialSummary: (): Promise<LeaseStatsResponse> =>
		apiClient<LeaseStatsResponse>(`${API_BASE_URL}/api/v1/leases/financial-summary`),
	
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
		apiClient<void>(`${API_BASE_URL}/api/v1/leases/${id}/terminate-calculated`, { 
			method: 'PUT' 
		}),
	
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

/**
 * Authentication API endpoints
 */
export const authApi = {
	register: (data: { email: string; firstName: string; lastName: string; password: string }) =>
		apiClient<{
			user: { id: string; email: string; name: string };
			access_token: string;
			refresh_token: string;
		}>(`${API_BASE_URL}/api/v1/auth/register`, {
			method: 'POST',
			body: JSON.stringify(data)
		}),
	
	login: (data: { email: string; password: string }) =>
		apiClient<{
			access_token: string;
			refresh_token: string;
			expires_in: number;
			user: { id: string; email: string; name?: string };
		}>(`${API_BASE_URL}/api/v1/auth/login`, {
			method: 'POST',
			body: JSON.stringify(data)
		}),
	
	logout: (token: string) =>
		apiClient<{ success: boolean }>(`${API_BASE_URL}/api/v1/auth/logout`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`
			}
		}),
	
	refreshToken: (refresh_token: string) =>
		apiClient<{
			access_token: string;
			refresh_token: string;
			expires_in: number;
		}>(`${API_BASE_URL}/api/v1/auth/refresh`, {
			method: 'POST',
			body: JSON.stringify({ refresh_token })
		}),
	
	getCurrentUser: (token: string) =>
		apiClient<{ id: string; email: string; name?: string; role?: string }>(`${API_BASE_URL}/api/v1/auth/me`, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		})
}

/**
 * Auth form draft API for React 19 useFormState integration
 */
export const authDraftApi = {
	save: (data: { email?: string; name?: string; formType: 'signup' | 'login' | 'reset' }) =>
		apiClient<{ success: boolean; sessionId: string }>(`${API_BASE_URL}/api/v1/auth/draft`, {
			method: 'POST',
			body: JSON.stringify(data)
		}),
	
	load: (formType: 'signup' | 'login' | 'reset', sessionId?: string) =>
		apiClient<{ email?: string; name?: string } | null>(
			`${API_BASE_URL}/api/v1/auth/draft/${formType}`,
			sessionId ? {
				headers: { 'x-session-id': sessionId }
			} : undefined
		)
}
