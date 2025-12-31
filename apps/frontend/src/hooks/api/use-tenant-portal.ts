'use client'

/**
 * Tenant Portal Hooks
 *
 * Modern hooks using /tenant-portal/* endpoints for tenant-facing operations
 * Uses native fetch for NestJS calls.
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
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { handleMutationSuccess } from '#lib/mutation-error-handler'
import {
	tenantPortalQueries,
	tenantPortalKeys,
	type TenantMaintenanceRequest,
	type MaintenanceRequestCreate
} from './queries/tenant-portal-queries'

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now imported from tenant-portal-queries.ts

// ============================================================================
// PAYMENTS HOOKS (/tenant-portal/payments/*)
// ============================================================================

/**
 * Get payment history and upcoming payments
 */
export function useTenantPayments() {
	return useQuery(tenantPortalQueries.payments())
}

// ============================================================================
// AUTOPAY HOOKS (/tenant-portal/autopay/*)
// ============================================================================

/**
 * Get autopay/subscription status for active lease
 */
export function useTenantAutopayStatus() {
	return useQuery(tenantPortalQueries.autopay())
}

// ============================================================================
// MAINTENANCE HOOKS (/tenant-portal/maintenance/*)
// ============================================================================

/**
 * Get maintenance request history with summary stats
 */
export function useTenantMaintenance() {
	return useQuery(tenantPortalQueries.maintenance())
}

/**
 * Create a maintenance request
 */
export function useMaintenanceRequestCreate() {
	const queryClient = useQueryClient()

	return useMutation({
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
// LEASES HOOKS (/tenant-portal/leases/*)
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
// SETTINGS HOOKS (/tenant-portal/settings/*)
// ============================================================================

/**
 * Get tenant profile and settings
 */
export function useTenantSettings() {
	return useQuery(tenantPortalQueries.settings())
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
		queryClient.prefetchQuery(tenantPortalQueries.payments())
	}
}

/**
 * Prefetch tenant lease
 */
export function usePrefetchTenantLease() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(tenantPortalQueries.lease())
	}
}

/**
 * Prefetch tenant maintenance requests
 */
export function usePrefetchTenantMaintenance() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(tenantPortalQueries.maintenance())
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
