'use client'

/**
 * Tenant Dashboard Hooks
 * Composite dashboard hook and plan limit enforcement for tenant portal
 *
 * Split from use-tenant-portal.ts for 300-line compliance
 */

import {
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { logger } from '#shared/lib/frontend-logger'
import { tenantPortalKeys } from './use-tenant-portal-keys'
import { useTenantLease } from './use-tenant-lease'
import { useTenantPayments } from './use-tenant-payments'
import { useTenantMaintenance } from './use-tenant-maintenance'
import { useTenantAutopayStatus } from './use-tenant-autopay'

// Re-export tenantPortalKeys for backward compatibility
export { tenantPortalKeys } from './use-tenant-portal-keys'

// ============================================================================
// COMPOSITE DASHBOARD HOOK
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
				upcoming: payments.data?.payments.find(p => p.status === 'pending') || null
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

// ============================================================================
// PLAN LIMIT ENFORCEMENT (PAY-12)
// ============================================================================

/**
 * Check if a user has access to create a resource based on plan limits.
 * Frontend guard only -- RLS/RPC is the real enforcement.
 * Fail-open: if the RPC doesn't exist or returns unexpected data, allow the operation.
 */
export function useCheckPlanAccess() {
	return useMutation({
		mutationKey: ['mutations', 'planAccess', 'check'] as const,
		mutationFn: async (params: { feature: string }): Promise<{ allowed: boolean }> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			try {
				const { data, error } = await supabase.rpc('check_user_feature_access', {
					p_user_id: user.id,
					p_feature: params.feature
				})

				if (error) {
					logger.warn('check_user_feature_access RPC failed, allowing operation', {
						action: 'plan_limit_check',
						metadata: { feature: params.feature, error: error.message }
					})
					return { allowed: true }
				}

				return { allowed: data as boolean }
			} catch {
				logger.warn('Plan limit check failed unexpectedly, allowing operation', {
					action: 'plan_limit_check',
					metadata: { feature: params.feature }
				})
				return { allowed: true }
			}
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
