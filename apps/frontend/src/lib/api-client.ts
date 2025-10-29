/**
 * Frontend API client configuration for TenantFlow
 * Integrates with shared API client and backend endpoints
 */
import type {
	CreateSetupIntentRequest,
	CreateSubscriptionRequest,
	DashboardFinancialStats,
	DashboardStats,
	ExpenseSummaryResponse,
	LeaseStatsResponse,
	MaintenanceRequest,
	MaintenanceRequestResponse,
	MaintenanceStats,
	PaymentMethodResponse,
	PaymentMethodSetupIntent,
	PropertyPerformance,
	PropertyStats,
	RentSubscriptionResponse,
	SetDefaultPaymentMethodRequest,
	SubscriptionActionResponse,
	SystemUptime,
	TenantStats,
	TenantWithLeaseInfo,
	UpdateSubscriptionRequest
} from '@repo/shared/types/core'

import type {
	InviteTenantWithLeaseRequest,
	InviteTenantWithLeaseResponse
} from '@repo/shared/types/backend-domain'

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

import { API_BASE_URL } from '@repo/shared/config/api'

/**
 * Server-side API wrapper - requires token from requireSession()
 * Use in Server Components for authenticated data fetching
 *
 * @example
 * ```tsx
 * // page.tsx (Server Component)
 * export default async function MyPage() {
 *   const { user, accessToken } = await requireSession()
 *   const serverApi = createServerApi(accessToken)
 *   const data = await serverApi.properties.list()
 *   return <MyClientComponent data={data} />
 * }
 * ```
 */
export const createServerApi = (accessToken: string) => ({
	properties: {
		list: (params?: { status?: string }) =>
			apiClient<Property[]>(
				`${API_BASE_URL}/api/v1/properties${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`,
				{ serverToken: accessToken }
			),

		getPropertiesWithAnalytics: () =>
			apiClient<PropertyWithUnits[]>(`${API_BASE_URL}/api/v1/properties/with-units`, {
				serverToken: accessToken
			}),

		getStats: () =>
			apiClient<PropertyStats>(`${API_BASE_URL}/api/v1/properties/stats`, {
				serverToken: accessToken
			}),

		get: (id: string) =>
			apiClient<Property>(`${API_BASE_URL}/api/v1/properties/${id}`, {
				serverToken: accessToken
			})
	},

	tenants: {
		list: (params?: { status?: string }) =>
			apiClient<TenantWithLeaseInfo[]>(
				`${API_BASE_URL}/api/v1/tenants${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`,
				{ serverToken: accessToken }
			),

		get: (id: string) =>
			apiClient<TenantWithLeaseInfo>(`${API_BASE_URL}/api/v1/tenants/${id}`, {
				serverToken: accessToken
			}),

		getTenantsWithAnalytics: () =>
			apiClient<TenantWithLeaseInfo[]>(`${API_BASE_URL}/api/v1/tenants/analytics`, {
				serverToken: accessToken
			}),

		stats: () =>
			apiClient<TenantStats>(`${API_BASE_URL}/api/v1/tenants/stats`, {
				serverToken: accessToken
			})
	},

	maintenance: {
		list: (params?: { status?: string }) =>
			apiClient<MaintenanceRequestResponse>(
				`${API_BASE_URL}/api/v1/maintenance${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`,
				{ serverToken: accessToken }
			),

		get: (id: string) =>
			apiClient<MaintenanceRequest>(`${API_BASE_URL}/api/v1/maintenance/${id}`, {
				serverToken: accessToken
			}),

		stats: () =>
			apiClient<MaintenanceStats>(`${API_BASE_URL}/api/v1/maintenance/stats`, {
				serverToken: accessToken
			})
	},

	dashboard: {
		getStats: () =>
			apiClient<DashboardStats>(`${API_BASE_URL}/api/v1/dashboard/stats`, {
				serverToken: accessToken
			}),

		getActivity: () =>
			apiClient<{ activities: Activity[] }>(
				`${API_BASE_URL}/api/v1/dashboard/activity`,
				{ serverToken: accessToken }
			),

		getPropertyPerformance: () =>
			apiClient<PropertyPerformance[]>(
				`${API_BASE_URL}/api/v1/dashboard/property-performance`,
				{ serverToken: accessToken }
			),

		getOccupancyTrends: (months: number = 12) =>
			apiClient<
				Array<{
					month: string
					occupancy_rate: number
					total_units: number
					occupied_units: number
				}>
			>(`${API_BASE_URL}/api/v1/dashboard/occupancy-trends?months=${months}`, {
				serverToken: accessToken
			}),

		getRevenueTrends: (months: number = 12) =>
			apiClient<
				Array<{
					month: string
					revenue: number
					growth: number
					previous_period_revenue: number
				}>
			>(`${API_BASE_URL}/api/v1/dashboard/revenue-trends?months=${months}`, {
				serverToken: accessToken
			}),

		getDashboardFinancialStatsCalculated: () =>
			apiClient<DashboardFinancialStats>(
				`${API_BASE_URL}/api/v1/financial/analytics/dashboard-metrics`,
				{ serverToken: accessToken }
			)
	},

	leases: {
		list: (params?: { status?: string }) =>
			apiClient<Lease[]>(
				`${API_BASE_URL}/api/v1/leases${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`,
				{ serverToken: accessToken }
			),

		get: (id: string) =>
			apiClient<Lease>(`${API_BASE_URL}/api/v1/leases/${id}`, {
				serverToken: accessToken
			}),

		getLeasesWithAnalytics: (status?: string) =>
			apiClient<Lease[]>(
				`${API_BASE_URL}/api/v1/leases/analytics${status ? `?status=${encodeURIComponent(status)}` : ''}`,
				{ serverToken: accessToken }
			),

		getLeaseFinancialSummary: () =>
			apiClient<LeaseStatsResponse>(`${API_BASE_URL}/api/v1/leases/financial-summary`, {
				serverToken: accessToken
			}),

		stats: () =>
			apiClient<LeaseStatsResponse>(`${API_BASE_URL}/api/v1/leases/stats`, {
				serverToken: accessToken
			})
	},

	units: {
		list: (params?: { status?: string }) =>
			apiClient<Unit[]>(
				`${API_BASE_URL}/api/v1/units${params?.status ? `?status=${encodeURIComponent(params.status)}` : ''}`,
				{ serverToken: accessToken }
			),

		stats: () =>
			apiClient<{
				totalUnits: number
				vacantUnits: number
				occupiedUnits: number
				maintenanceUnits: number
				reservedUnits: number
				occupancyRate: number
			}>(`${API_BASE_URL}/api/v1/units/stats`, {
				serverToken: accessToken
			})
	},

	reports: {
		listSchedules: () =>
			apiClient<{ data: import('#lib/api/reports-client').ScheduledReport[] }>(
				`${API_BASE_URL}/api/v1/reports/schedules`,
				{ serverToken: accessToken }
			).then(res => res.data)
	},

	users: {
		getCurrentUser: () =>
			apiClient<{
				id: string
				email: string
				stripeCustomerId: string | null
			}>(`${API_BASE_URL}/api/v1/users/me`, {
				serverToken: accessToken
			})
	}
})

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

,

	bulkImport: (file: File) => {
		const formData = new FormData()
		formData.append('file', file)

		return apiClient<{
			success: boolean
			imported: number
			failed: number
			errors: Array<{ row: number; error: string }>
		}>(`${API_BASE_URL}/api/v1/properties/bulk-import`, {
			method: 'POST',
			body: formData
			// Don't set headers - let apiClient handle auth and browser handle Content-Type
		})
	}
}

export { apiClient, API_BASE_URL }

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
		}),
	markAsMovedOut: (
		id: string,
		data: { moveOutDate: string; moveOutReason: string }
	) =>
		apiClient<TenantWithLeaseInfo>(
			`${API_BASE_URL}/api/v1/tenants/${id}/mark-moved-out`,
			{
				method: 'PUT',
				body: JSON.stringify(data)
			}
		),
	hardDelete: (id: string) =>
		apiClient<void>(`${API_BASE_URL}/api/v1/tenants/${id}/hard-delete`, {
			method: 'DELETE'
		}),
	/**
	 * ✅ NEW: Send tenant invitation via Supabase Auth (V2 - Phase 3.1)
	 */
	sendInvitationV2: (id: string, params?: { propertyId?: string; leaseId?: string }) =>
		apiClient<{ success: boolean; authUserId?: string; message: string }>(
			`${API_BASE_URL}/api/v1/tenants/${id}/invite-v2`,
			{
				method: 'POST',
				body: JSON.stringify(params || {})
			}
		),
	/**
	 * ✅ NEW: Create tenant + lease atomically and send Supabase Auth invitation (Phase 3.1)
	 */
	inviteWithLease: (body: InviteTenantWithLeaseRequest) =>
		apiClient<InviteTenantWithLeaseResponse>(
			`${API_BASE_URL}/api/v1/tenants/invite-with-lease`,
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		)
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
		apiClient<void>(`${API_BASE_URL}/api/v1/leases/${id}`, {
			method: 'DELETE'
		}),

	// Lease renewal
	renew: (leaseId: string, data: { endDate: string; rentAmount?: number }) =>
		apiClient<Lease>(`${API_BASE_URL}/api/v1/leases/${leaseId}/renew`, {
			method: 'POST',
			body: JSON.stringify(data)
		}),

	// Lease termination
	terminate: (leaseId: string, data: { terminationDate: string; reason?: string }) =>
		apiClient<Lease>(`${API_BASE_URL}/api/v1/leases/${leaseId}/terminate`, {
			method: 'POST',
			body: JSON.stringify(data)
		}),

	// Expiring leases
	getExpiring: (days: number = 30) =>
		apiClient<Lease[]>(`${API_BASE_URL}/api/v1/leases/expiring?days=${days}`)
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
		}>(`${API_BASE_URL}/api/v1/stripe/prices`),

	/**
	 * Create Stripe Checkout Session for subscription purchase
	 * Official Stripe pattern: checkout session with mode='subscription'
	 */
	createCheckoutSession: (params: {
		priceId: string
		tenantId: string
		customerEmail?: string
		productName: string
	}) =>
		apiClient<{
			url: string
			session_id: string
		}>(`${API_BASE_URL}/api/v1/stripe/create-checkout-session`, {
			method: 'POST',
			body: JSON.stringify({
				priceId: params.priceId,
				tenantId: params.tenantId,
				customerEmail: params.customerEmail,
				productName: params.productName,
				isSubscription: true,
				domain: typeof window !== 'undefined' ? window.location.origin : ''
			})
		})
}

/**
 * Subscriptions API - Phase 4: Autopay Subscriptions
 */
export const subscriptionsApi = {
	create: (data: CreateSubscriptionRequest) =>
		apiClient<RentSubscriptionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions`,
			{
				method: 'POST',
				body: JSON.stringify(data)
			}
		),

	list: async (): Promise<RentSubscriptionResponse[]> => {
		const response = await apiClient<{
			subscriptions: RentSubscriptionResponse[]
		}>(`${API_BASE_URL}/api/v1/subscriptions`)
		return response.subscriptions
	},

	get: (id: string) =>
		apiClient<RentSubscriptionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}`
		),

	update: (id: string, data: UpdateSubscriptionRequest) =>
		apiClient<RentSubscriptionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}`,
			{
				method: 'PATCH',
				body: JSON.stringify(data)
			}
		),

	pause: (id: string) =>
		apiClient<SubscriptionActionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}/pause`,
			{ method: 'POST' }
		),

	resume: (id: string) =>
		apiClient<SubscriptionActionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}/resume`,
			{ method: 'POST' }
		),

	cancel: (id: string) =>
		apiClient<SubscriptionActionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}/cancel`,
			{ method: 'POST' }
		)
}

/**
 * Payment Methods API - Phase 3: Tenant Payment System
 */
export const paymentMethodsApi = {
	createSetupIntent: (data: CreateSetupIntentRequest) =>
		apiClient<PaymentMethodSetupIntent>(
			`${API_BASE_URL}/api/v1/payment-methods/setup-intent`,
			{
				method: 'POST',
				body: JSON.stringify(data)
			}
		),

	savePaymentMethod: (paymentMethodId: string) =>
		apiClient<{ success: boolean }>(
			`${API_BASE_URL}/api/v1/payment-methods/save`,
			{
				method: 'POST',
				body: JSON.stringify({ paymentMethodId })
			}
		),

	listPaymentMethods: async (): Promise<PaymentMethodResponse[]> => {
		const response = await apiClient<{
			paymentMethods: PaymentMethodResponse[]
		}>(`${API_BASE_URL}/api/v1/payment-methods`)
		return response.paymentMethods
	},

	setDefaultPaymentMethod: (data: SetDefaultPaymentMethodRequest) =>
		apiClient<{ success: boolean }>(
			`${API_BASE_URL}/api/v1/payment-methods/${data.paymentMethodId}/default`,
			{ method: 'PATCH' }
		),

	deletePaymentMethod: (paymentMethodId: string) =>
		apiClient<{ success: boolean }>(
			`${API_BASE_URL}/api/v1/payment-methods/${paymentMethodId}`,
			{ method: 'DELETE' }
		)
}

/**
 * Late Fees API - Phase 6.1: Late Fee System
 */
export interface LateFeeConfig {
	leaseId: string
	gracePeriodDays: number
	flatFeeAmount: number
}

export interface LateFeeCalculation {
	rentAmount: number
	daysLate: number
	gracePeriod: number
	lateFeeAmount: number
	shouldApplyFee: boolean
	reason: string
}

export interface OverduePayment {
	id: string
	amount: number
	dueDate: string
	daysOverdue: number
	lateFeeApplied: boolean
}

export interface ProcessLateFeesResult {
	processed: number
	totalLateFees: number
	details: Array<{
		paymentId: string
		lateFeeAmount: number
		daysOverdue: number
	}>
}

export interface ApplyLateFeeResult {
	invoiceItemId: string
	amount: number
	paymentId: string
}

export const lateFeesApi = {
	getConfig: async (leaseId: string): Promise<LateFeeConfig> => {
		const response = await apiClient<{ success: boolean; data: LateFeeConfig }>(
			`${API_BASE_URL}/api/v1/late-fees/lease/${leaseId}/config`
		)
		return response.data
	},

	updateConfig: (
		leaseId: string,
		gracePeriodDays?: number,
		flatFeeAmount?: number
	) =>
		apiClient<{ success: boolean; message: string }>(
			`${API_BASE_URL}/api/v1/late-fees/lease/${leaseId}/config`,
			{
				method: 'PUT',
				body: JSON.stringify({ gracePeriodDays, flatFeeAmount })
			}
		),

	calculate: async (
		rentAmount: number,
		daysLate: number,
		leaseId?: string
	): Promise<LateFeeCalculation> => {
		const response = await apiClient<{
			success: boolean
			data: LateFeeCalculation
		}>(`${API_BASE_URL}/api/v1/late-fees/calculate`, {
			method: 'POST',
			body: JSON.stringify({ rentAmount, daysLate, leaseId })
		})
		return response.data
	},

	getOverduePayments: async (
		leaseId: string
	): Promise<{ payments: OverduePayment[]; gracePeriod: number }> => {
		const response = await apiClient<{
			success: boolean
			data: { payments: OverduePayment[]; gracePeriod: number }
		}>(`${API_BASE_URL}/api/v1/late-fees/lease/${leaseId}/overdue`)
		return response.data
	},

	processLateFees: async (leaseId: string): Promise<ProcessLateFeesResult> => {
		const response = await apiClient<{
			success: boolean
			data: ProcessLateFeesResult
			message: string
		}>(`${API_BASE_URL}/api/v1/late-fees/lease/${leaseId}/process`, {
			method: 'POST'
		})
		return response.data
	},

	applyLateFee: async (
		paymentId: string,
		lateFeeAmount: number,
		reason: string
	): Promise<ApplyLateFeeResult> => {
		const response = await apiClient<{
			success: boolean
			data: ApplyLateFeeResult
			message: string
		}>(`${API_BASE_URL}/api/v1/late-fees/payment/${paymentId}/apply`, {
			method: 'POST',
			body: JSON.stringify({ lateFeeAmount, reason })
		})
		return response.data
	}
}

/**
 * Reports API - Server-side methods for report schedules
 */
export const reportsApi = {
	listSchedules: () =>
		apiClient<{ data: import('#lib/api/reports-client').ScheduledReport[] }>(
			`${API_BASE_URL}/api/v1/reports/schedules`
		).then(res => res.data)
}

// Visitor Analytics - Future Feature
// When implementing, add analytics endpoints here

/**
 * Users API - Current user data with Stripe integration
 */
export const usersApi = {
	getCurrentUser: () =>
		apiClient<{
			id: string
			email: string
			stripeCustomerId: string | null
		}>(`${API_BASE_URL}/api/v1/users/me`)
}

// Note: Authentication is handled directly via Supabase Auth
// See use-supabase-auth.ts for all authentication operations
// No backend auth proxy needed - uses native Supabase client integration
