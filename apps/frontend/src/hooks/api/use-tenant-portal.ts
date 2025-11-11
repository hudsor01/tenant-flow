'use client'

/**
 * Tenant Portal Hooks
 * 
 * Modern hooks using /tenant-portal/* endpoints for tenant-facing operations
 * 
 * Architecture:
 * - Role-based access control (TenantAuthGuard)
 * - Three-layer security (JWT + Role + RLS)
 * - Request context with tenant metadata
 * - Modular route structure
 * 
 * Endpoints:
 * - /tenant-portal/payments/* - Payment history and methods
 * - /tenant-portal/autopay/* - Subscription status and configuration
 * - /tenant-portal/maintenance/* - Submit and track maintenance requests
 * - /tenant-portal/leases/* - Active lease and documents
 * - /tenant-portal/settings/* - Profile and preferences
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { MaintenanceCategory } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'

type Priority = Database['public']['Enums']['Priority']

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TenantPayment {
	id: string
	amount: number
	status: string
	paidAt: string | null
	dueDate: string
	createdAt: string
	leaseId: string
	tenantId: string
	stripePaymentIntentId: string | null
	ownerReceives: number
	receiptUrl: string | null
}

interface TenantAutopayStatus {
	autopayEnabled: boolean
	subscriptionId: string | null
	leaseId?: string
	rentAmount?: number
	nextPaymentDate?: string | null
	message?: string
}

interface TenantMaintenanceRequest {
	id: string
	title: string
	description: string | null
	priority: Priority
	status: string
	category: MaintenanceCategory | null
	createdAt: string
	updatedAt: string | null
	completedAt: string | null
	requestedBy: string
	unitId: string
}

interface TenantMaintenanceStats {
	total: number
	open: number
	inProgress: number
	completed: number
}

interface TenantLease {
	id: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number | null
	status: string
	stripe_subscription_id: string | null
	lease_document_url: string | null
	createdAt: string
	unit: {
		id: string
		unitNumber: string
		bedrooms: number
		bathrooms: number
		property: {
			id: string
			name: string
			address: string
			city: string
			state: string
			zipCode: string
		}
	} | null
	metadata: {
		documentUrl: string | null
	}
}

interface TenantDocument {
	id: string
	type: 'LEASE' | 'RECEIPT'
	name: string
	url: string | null
	createdAt: string | null
}

interface TenantProfile {
	id: string
	firstName: string
	lastName: string
	email: string
	phone: string | null
	status: string
}

interface TenantSettings {
	profile: TenantProfile
	preferences: {
		notifications: boolean
		emailReminders: boolean
	}
}

interface CreateMaintenanceRequestInput {
	title: string
	description: string
	priority: Priority
	category?: MaintenanceCategory
	allowEntry: boolean
	photos?: string[]
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Hierarchical query keys for tenant portal
 * Enables targeted cache invalidation
 */
export const tenantPortalKeys = {
	all: ['tenant-portal'] as const,
	
	// Payments endpoints (/tenant-portal/payments/*)
	payments: {
		all: () => [...tenantPortalKeys.all, 'payments'] as const,
		list: () => [...tenantPortalKeys.payments.all(), 'list'] as const
	},
	
	// Autopay endpoints (/tenant-portal/autopay/*)
	autopay: {
		all: () => [...tenantPortalKeys.all, 'autopay'] as const,
		status: () => [...tenantPortalKeys.autopay.all(), 'status'] as const
	},
	
	// Maintenance endpoints (/tenant-portal/maintenance/*)
	maintenance: {
		all: () => [...tenantPortalKeys.all, 'maintenance'] as const,
		list: () => [...tenantPortalKeys.maintenance.all(), 'list'] as const
	},
	
	// Leases endpoints (/tenant-portal/leases/*)
	leases: {
		all: () => [...tenantPortalKeys.all, 'leases'] as const,
		active: () => [...tenantPortalKeys.leases.all(), 'active'] as const,
		documents: () => [...tenantPortalKeys.leases.all(), 'documents'] as const
	},
	
	// Settings endpoints (/tenant-portal/settings/*)
	settings: {
		all: () => [...tenantPortalKeys.all, 'settings'] as const,
		profile: () => [...tenantPortalKeys.settings.all(), 'profile'] as const
	}
}

// ============================================================================
// PAYMENTS HOOKS (/tenant-portal/payments/*)
// ============================================================================

/**
 * Get payment history and upcoming payments
 */
export function useTenantPayments() {
	return useQuery({
		queryKey: tenantPortalKeys.payments.list(),
		queryFn: () => clientFetch<{
			payments: TenantPayment[]
			methodsEndpoint: string
		}>('/api/v1/tenant-portal/payments'),
		...QUERY_CACHE_TIMES.LIST,
		refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		retry: 2
	})
}

// ============================================================================
// AUTOPAY HOOKS (/tenant-portal/autopay/*)
// ============================================================================

/**
 * Get autopay/subscription status for active lease
 */
export function useTenantAutopayStatus() {
	return useQuery({
		queryKey: tenantPortalKeys.autopay.status(),
		queryFn: () => clientFetch<TenantAutopayStatus>('/api/v1/tenant-portal/autopay'),
		...QUERY_CACHE_TIMES.DETAIL,
		refetchInterval: 5 * 60 * 1000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		retry: 2
	})
}

// ============================================================================
// MAINTENANCE HOOKS (/tenant-portal/maintenance/*)
// ============================================================================

/**
 * Get maintenance request history with summary stats
 */
export function useTenantMaintenance() {
	return useQuery({
		queryKey: tenantPortalKeys.maintenance.list(),
		queryFn: () => clientFetch<{
			requests: TenantMaintenanceRequest[]
			summary: TenantMaintenanceStats
		}>('/api/v1/tenant-portal/maintenance'),
		...QUERY_CACHE_TIMES.LIST,
		refetchInterval: 5 * 60 * 1000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		retry: 2
	})
}

/**
 * Create a maintenance request
 */
export function useCreateMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (request: CreateMaintenanceRequestInput) =>
			clientFetch<TenantMaintenanceRequest>('/api/v1/tenant-portal/maintenance', {
				method: 'POST',
				body: JSON.stringify(request)
			}),
		onSuccess: () => {
			// Invalidate maintenance list to refetch with new request
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.maintenance.list() })
		}
	})
}

// ============================================================================
// LEASES HOOKS (/tenant-portal/leases/*)
// ============================================================================

/**
 * Alias for useTenantLeaseDocuments (backwards compatibility)
 */
export function useTenantPortalDocuments() {
	return useTenantLeaseDocuments()
}

/**
 * Combined dashboard hook for tenant portal homepage
 * Returns TanStack Query-compatible result with data property
 */
export function useTenantPortalDashboard() {
	const lease = useTenantLease()
	const payments = useTenantPayments()
	const maintenance = useTenantMaintenance()
	const autopay = useTenantAutopayStatus()

	const isLoading = lease.isLoading || payments.isLoading || maintenance.isLoading || autopay.isLoading
	const error = lease.error || payments.error || maintenance.error || autopay.error

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
 * Alias for useCreateMaintenanceRequest (backwards compatibility)
 */
export function useCreateTenantMaintenanceRequest() {
	return useCreateMaintenanceRequest()
}

/**
 * Get active lease with unit/property metadata
 */
export function useTenantLease() {
	return useQuery({
		queryKey: tenantPortalKeys.leases.active(),
		queryFn: () => clientFetch<TenantLease | null>('/api/v1/tenant-portal/leases'),
		...QUERY_CACHE_TIMES.DETAIL,
		refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		retry: 2
	})
}

/**
 * Get lease documents (signed agreement, receipts)
 */
export function useTenantLeaseDocuments() {
	return useQuery({
		queryKey: tenantPortalKeys.leases.documents(),
		queryFn: () => clientFetch<{ documents: TenantDocument[] }>('/api/v1/tenant/leases/documents'),
		...QUERY_CACHE_TIMES.DETAIL,
		refetchInterval: 10 * 60 * 1000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		retry: 2
	})
}

// ============================================================================
// SETTINGS HOOKS (/tenant-portal/settings/*)
// ============================================================================

/**
 * Get tenant profile and settings
 */
export function useTenantSettings() {
	return useQuery({
		queryKey: tenantPortalKeys.settings.profile(),
		queryFn: () => clientFetch<TenantSettings>('/api/v1/tenant-portal/settings'),
		...QUERY_CACHE_TIMES.DETAIL,
		refetchInterval: 10 * 60 * 1000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		retry: 2
	})
}

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

/**
 * Prefetch tenant payments
 */
export function usePrefetchTenantPayments() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: tenantPortalKeys.payments.list(),
			queryFn: () => clientFetch<{
				payments: TenantPayment[]
				methodsEndpoint: string
			}>('/api/v1/tenant-portal/payments'),
			...QUERY_CACHE_TIMES.LIST
		})
	}
}

/**
 * Prefetch tenant lease
 */
export function usePrefetchTenantLease() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: tenantPortalKeys.leases.active(),
			queryFn: () => clientFetch<TenantLease | null>('/api/v1/tenant-portal/leases'),
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}

/**
 * Prefetch tenant maintenance requests
 */
export function usePrefetchTenantMaintenance() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: tenantPortalKeys.maintenance.list(),
			queryFn: () => clientFetch<{
				requests: TenantMaintenanceRequest[]
				summary: TenantMaintenanceStats
			}>('/api/v1/tenant-portal/maintenance'),
			...QUERY_CACHE_TIMES.LIST
		})
	}
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Invalidate all tenant portal data
 */
export function useInvalidateTenantPortal() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.invalidateQueries({ queryKey: tenantPortalKeys.all })
	}
}

/**
 * Invalidate specific tenant portal sections
 */
export function useTenantPortalCacheUtils() {
	const queryClient = useQueryClient()

	return {
		invalidatePayments: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.payments.all() })
		},
		invalidateAutopay: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.autopay.all() })
		},
		invalidateMaintenance: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.maintenance.all() })
		},
		invalidateLeases: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.leases.all() })
		},
		invalidateSettings: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.settings.all() })
		},
		invalidateAll: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.all })
		}
	}
}
