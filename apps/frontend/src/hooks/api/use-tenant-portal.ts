'use client'

/**
 * Tenant Portal Hooks & Query Options
 * TanStack Query hooks for tenant-facing operations with colocated query options
 *
 * Architecture:
 * - user_type-based access control (TenantAuthGuard)
 * - Three-layer security (JWT + user_type + RLS)
 * - Request context with tenant metadata
 * - Modular route structure
 *
 * Endpoints:
 * - /tenant-portal/payments/* - Payment history and methods
 * - /tenant-portal/autopay/* - Subscription status and configuration
 * - /tenant-portal/maintenance/* - Submit and track maintenance requests
 * - /tenant-portal/leases/* - Active lease and documents
 * - /tenant-portal/settings/* - Profile and preferences
 *
 * React 19 + TanStack Query v5 patterns
 */

import {
	queryOptions,
	useQuery,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { DEFAULT_RETRY_ATTEMPTS } from '@repo/shared/types/api-contracts'
import { logger } from '@repo/shared/lib/frontend-logger'
import type {
	MaintenanceCategory,
	MaintenancePriority
} from '@repo/shared/types/core'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tenant payment entity
 */
export interface TenantPayment {
	id: string
	amount: number
	status: string
	paidAt: string | null
	dueDate: string
	created_at: string
	lease_id: string
	tenant_id: string
	stripePaymentIntentId: string | null
	ownerReceives: number
	receiptUrl: string | null
}

export interface TenantAutopayStatus {
	autopayEnabled: boolean
	subscriptionId: string | null
	subscriptionStatus?: string | null
	lease_id?: string
	tenant_id?: string
	rent_amount?: number
	nextPaymentDate?: string | null
	message?: string
}

export interface TenantMaintenanceRequest {
	id: string
	title: string
	description: string | null
	priority: MaintenancePriority
	status: string
	category: MaintenanceCategory | null
	created_at: string
	updated_at: string | null
	completed_at: string | null
	requestedBy: string
	unit_id: string
}

export interface TenantMaintenanceStats {
	total: number
	open: number
	inProgress: number
	completed: number
}

export interface TenantLease {
	id: string
	start_date: string
	end_date: string
	rent_amount: number
	security_deposit: number | null
	status: string
	lease_status: string
	stripe_subscription_id: string | null
	lease_document_url: string | null
	created_at: string
	// Signature tracking fields
	owner_signed_at: string | null
	tenant_signed_at: string | null
	sent_for_signature_at: string | null
	unit: {
		id: string
		unit_number: string
		bedrooms: number
		bathrooms: number
		property: {
			id: string
			name: string
			address: string
			city: string
			state: string
			postal_code: string
		}
	} | null
	metadata: {
		documentUrl: string | null
	}
}

export interface TenantDocument {
	id: string
	type: 'LEASE' | 'RECEIPT'
	name: string
	url: string | null
	created_at: string | null
}

export interface TenantProfile {
	id: string
	first_name: string | null
	last_name: string | null
	email: string | null
	phone: string | null
}

export interface TenantSettings {
	profile: TenantProfile
}

/**
 * Tenant-specific notification preferences
 * Used by tenant portal for self-management of preferences
 */
export interface TenantNotificationPreferences {
	rentReminders: boolean
	maintenanceUpdates: boolean
	propertyNotices: boolean
	emailNotifications: boolean
	smsNotifications: boolean
}

export interface MaintenanceRequestCreate {
	title: string
	description: string
	priority: MaintenancePriority
	category?: MaintenanceCategory
	allowEntry: boolean
	photos?: string[]
}

/**
 * Amount due response type
 */
export interface AmountDueResponse {
	base_rent_cents: number
	late_fee_cents: number
	total_due_cents: number
	due_date: string
	days_late: number
	grace_period_days: number
	already_paid: boolean
	breakdown: Array<{
		description: string
		amount_cents: number
	}>
}

/**
 * Pay rent request type
 */
export interface PayRentRequest {
	payment_method_id: string
	amount_cents: number
}

/**
 * Pay rent response type
 */
export interface PayRentResponse {
	success: boolean
	payment_id: string
	status: string
	message: string
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Tenant portal query keys for cache management
 */
export const tenantPortalKeys = {
	all: ['tenant-portal'] as const,
	dashboard: () => [...tenantPortalKeys.all, 'dashboard'] as const,
	amountDue: () => [...tenantPortalKeys.all, 'amount-due'] as const,
	payments: {
		all: () => [...tenantPortalKeys.all, 'payments'] as const
	},
	autopay: {
		all: () => [...tenantPortalKeys.all, 'autopay'] as const,
		status: () => [...tenantPortalKeys.all, 'autopay'] as const
	},
	maintenance: {
		all: () => [...tenantPortalKeys.all, 'maintenance'] as const,
		list: () => [...tenantPortalKeys.all, 'maintenance'] as const
	},
	leases: {
		all: () => [...tenantPortalKeys.all, 'lease'] as const
	},
	documents: {
		all: () => [...tenantPortalKeys.all, 'documents'] as const
	},
	settings: {
		all: () => [...tenantPortalKeys.all, 'settings'] as const
	},
	notificationPreferences: {
		all: () => [...tenantPortalKeys.all, 'notification-preferences'] as const,
		detail: (tenantId: string) =>
			[...tenantPortalKeys.all, 'notification-preferences', tenantId] as const
	}
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Tenant portal query factory
 *
 * Cache Strategy:
 * - STATS (1 min staleTime): Amount due - needs frequent updates
 * - LIST (10 min staleTime): Payments, maintenance - moderate freshness
 * - DETAIL (5 min staleTime): Dashboard, autopay, lease, documents, settings
 *
 * Refetch Strategy:
 * - refetchOnWindowFocus: false - staleTime handles freshness
 * - refetchInterval: Only for critical real-time data (amount due)
 * - refetchIntervalInBackground: false - save resources when tab inactive
 */
export const tenantPortalQueries = {
	/**
	 * Base key for all tenant portal queries
	 */
	all: () => ['tenant-portal'] as const,

	/**
	 * Dashboard data
	 */
	dashboard: () =>
		queryOptions({
			queryKey: tenantPortalKeys.dashboard(),
			queryFn: () => apiRequest('/api/v1/tenant-portal/dashboard'),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false
		}),

	/**
	 * Amount due for current period
	 * Primary: SSE push via 'payment.status_updated' event
	 * Fallback: 2 min polling for critical payment data
	 */
	amountDue: () =>
		queryOptions({
			queryKey: tenantPortalKeys.amountDue(),
			queryFn: () =>
				apiRequest<AmountDueResponse>('/api/v1/tenants/payments/amount-due'),
			...QUERY_CACHE_TIMES.STATS,
			refetchInterval: 2 * 60 * 1000, // Fallback: 2 min polling (SSE is primary)
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true // Catch missed events on tab focus
		}),

	/**
	 * Payment history and upcoming payments
	 * Primary: SSE push via 'payment.status_updated' event
	 */
	payments: () =>
		queryOptions({
			queryKey: tenantPortalKeys.payments.all(),
			queryFn: () =>
				apiRequest<{
					payments: TenantPayment[]
					methodsEndpoint: string
				}>('/api/v1/tenants/payments'),
			...QUERY_CACHE_TIMES.LIST,
			// No interval - SSE handles updates, tab focus catches missed events
			refetchOnWindowFocus: true,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Autopay/subscription status for active lease
	 */
	autopay: () =>
		queryOptions({
			queryKey: tenantPortalKeys.autopay.all(),
			queryFn: () => apiRequest<TenantAutopayStatus>('/api/v1/tenants/autopay'),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Maintenance request history with summary stats
	 */
	maintenance: () =>
		queryOptions({
			queryKey: tenantPortalKeys.maintenance.all(),
			queryFn: () =>
				apiRequest<{
					requests: TenantMaintenanceRequest[]
					summary: TenantMaintenanceStats
				}>('/api/v1/tenants/maintenance'),
			...QUERY_CACHE_TIMES.LIST,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Active lease with unit/property metadata
	 */
	lease: () =>
		queryOptions({
			queryKey: tenantPortalKeys.leases.all(),
			queryFn: () => apiRequest<TenantLease | null>('/api/v1/tenants/leases'),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Lease documents (signed agreement, receipts)
	 */
	documents: () =>
		queryOptions({
			queryKey: tenantPortalKeys.documents.all(),
			queryFn: () =>
				apiRequest<{ documents: TenantDocument[] }>(
					'/api/v1/tenants/leases/documents'
				),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Tenant profile and settings
	 */
	settings: () =>
		queryOptions({
			queryKey: tenantPortalKeys.settings.all(),
			queryFn: () => apiRequest<TenantSettings>('/api/v1/tenants/settings'),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Tenant notification preferences (self-managed by tenant)
	 */
	notificationPreferences: (tenantId: string) =>
		queryOptions({
			queryKey: tenantPortalKeys.notificationPreferences.detail(tenantId),
			queryFn: () =>
				apiRequest<TenantNotificationPreferences>(
					`/api/v1/tenants/${tenantId}/notification-preferences`
				),
			enabled: !!tenantId,
			...QUERY_CACHE_TIMES.DETAIL
		})
}

// ============================================================================
// QUERY HOOKS - PAYMENTS (/tenant-portal/payments/*)
// ============================================================================

/**
 * Get payment history and upcoming payments
 */
export function useTenantPayments() {
	return useQuery(tenantPortalQueries.payments())
}

// ============================================================================
// QUERY HOOKS - AUTOPAY (/tenant-portal/autopay/*)
// ============================================================================

/**
 * Get autopay/subscription status for active lease
 */
export function useTenantAutopayStatus() {
	return useQuery(tenantPortalQueries.autopay())
}

// ============================================================================
// QUERY HOOKS - MAINTENANCE (/tenant-portal/maintenance/*)
// ============================================================================

/**
 * Get maintenance request history with summary stats
 */
export function useTenantMaintenance() {
	return useQuery(tenantPortalQueries.maintenance())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a maintenance request
 */
export function useMaintenanceRequestCreateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantPortal.createMaintenanceRequest,
		mutationFn: (request: MaintenanceRequestCreate) =>
			apiRequest<TenantMaintenanceRequest>('/api/v1/tenants/maintenance', {
				method: 'POST',
				body: JSON.stringify(request)
			}),
		onSuccess: () => {
			handleMutationSuccess('Maintenance request created successfully')
			// Invalidate maintenance list to refetch with new request
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.maintenance.list()
			})
		}
	})
}

// ============================================================================
// QUERY HOOKS - LEASES (/tenant-portal/leases/*)
// ============================================================================

/**
 * Combined dashboard hook for tenant portal homepage
 * Returns TanStack Query-compatible result with data property
 */
export function useTenantPortalDashboard() {
	const lease = useTenantLease()
	const payments = useTenantPayments()
	const maintenance = useTenantMaintenance()
	const autopay = useTenantAutopayStatus()

	const isLoading =
		lease.isLoading ||
		payments.isLoading ||
		maintenance.isLoading ||
		autopay.isLoading
	const error =
		lease.error || payments.error || maintenance.error || autopay.error

	return {
		data: {
			lease: lease.data,
			payments: {
				recent: payments.data?.payments.slice(0, 5) || [],
				upcoming: payments.data?.payments.find(p => p.status === 'DUE') || null
			},
			maintenance: {
				...maintenance.data?.summary,
				recent: maintenance.data?.requests.slice(0, 5) || []
			},
			autopayStatus: autopay.data
		},
		isLoading,
		error
	}
}

/**
 * Get active lease with unit/property metadata
 */
export function useTenantLease() {
	return useQuery(tenantPortalQueries.lease())
}

/**
 * Get lease documents (signed agreement, receipts)
 */
export function useTenantLeaseDocuments() {
	return useQuery(tenantPortalQueries.documents())
}

// ============================================================================
// QUERY HOOKS - SETTINGS (/tenant-portal/settings/*)
// ============================================================================

/**
 * Get tenant profile and settings
 */
export function useTenantSettings() {
	return useQuery(tenantPortalQueries.settings())
}

// ============================================================================
// QUERY HOOKS - NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Get notification preferences for a tenant (tenant self-service)
 */
export function useTenantNotificationPreferences(tenantId: string) {
	return useQuery(tenantPortalQueries.notificationPreferences(tenantId))
}

/**
 * Update notification preferences (tenant self-service)
 * Includes optimistic updates with rollback
 */
export function useUpdateTenantNotificationPreferences(tenantId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantNotificationPreferences.update,
		mutationFn: (preferences: Partial<TenantNotificationPreferences>) =>
			apiRequest<TenantNotificationPreferences>(
				`/api/v1/tenants/${tenantId}/notification-preferences`,
				{
					method: 'PUT',
					body: JSON.stringify(preferences)
				}
			),
		onMutate: async (newPreferences: Partial<TenantNotificationPreferences>) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: tenantPortalKeys.notificationPreferences.detail(tenantId)
			})

			// Snapshot previous state
			const previousPreferences =
				queryClient.getQueryData<TenantNotificationPreferences>(
					tenantPortalKeys.notificationPreferences.detail(tenantId)
				)

			// Optimistically update
			if (previousPreferences) {
				queryClient.setQueryData<TenantNotificationPreferences>(
					tenantPortalKeys.notificationPreferences.detail(tenantId),
					(old: TenantNotificationPreferences | undefined) =>
						old ? { ...old, ...newPreferences } : undefined
				)
			}

			return { previousPreferences }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousPreferences) {
				queryClient.setQueryData(
					tenantPortalKeys.notificationPreferences.detail(tenantId),
					context.previousPreferences
				)
			}

			logger.error('Failed to update notification preferences', {
				action: 'update_notification_preferences',
				metadata: {
					tenant_id: tenantId,
					error: err instanceof Error ? err.message : String(err)
				}
			})

			handleMutationError(err, 'Update notification preferences')
		},
		onSuccess: data => {
			// Update cache with server response
			queryClient.setQueryData<TenantNotificationPreferences>(
				tenantPortalKeys.notificationPreferences.detail(tenantId),
				data
			)

			handleMutationSuccess(
				'Update notification preferences',
				'Your notification preferences have been saved'
			)

			logger.info('Notification preferences updated', {
				action: 'update_notification_preferences',
				metadata: { tenant_id: tenantId }
			})
		}
	})
}

// ============================================================================
// MUTATION HOOKS - AUTOPAY
// ============================================================================

/**
 * Setup autopay for tenant's lease
 */
export function useTenantPortalSetupAutopayMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantAutopay.setup,
		mutationFn: async (params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		}) => {
			return apiRequest('/api/v1/rent-payments/autopay/setup', {
				method: 'POST',
				body: JSON.stringify(params)
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.status()
			})
		}
	})
}

/**
 * Cancel autopay for tenant's lease
 */
export function useTenantPortalCancelAutopayMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantAutopay.cancel,
		mutationFn: async (params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		}) => {
			return apiRequest('/api/v1/rent-payments/autopay/cancel', {
				method: 'POST',
				body: JSON.stringify(params)
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.status()
			})
		}
	})
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Invalidate specific tenant portal sections
 */
export function useTenantPortalCacheUtils() {
	const queryClient = useQueryClient()

	return {
		invalidatePayments: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.payments.all()
			})
		},
		invalidateAutopay: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.all()
			})
		},
		invalidateMaintenance: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.maintenance.all()
			})
		},
		invalidateLeases: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.leases.all() })
		},
		invalidateSettings: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.settings.all()
			})
		},
		invalidateAll: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.all })
		}
	}
}
