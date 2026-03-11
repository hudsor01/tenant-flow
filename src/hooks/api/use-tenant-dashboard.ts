'use client'

/**
 * Tenant Dashboard Hooks
 * Composite dashboard hook and plan limit enforcement for tenant portal
 *
 * Split from use-tenant-portal.ts for 300-line compliance
 */

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

