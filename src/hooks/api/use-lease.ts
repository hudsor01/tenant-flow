/**
 * Lease Query Hooks & Query Options
 * TanStack Query hooks for lease data fetching
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Mutation hooks are in use-lease-mutations.ts.
 * Query keys are in a separate file to avoid circular dependencies.
 */

import { useEffect } from 'react'
import { usePrefetchQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lease } from '#types/core'
import { useEntityDetail } from '#hooks/use-entity-detail'
// Import query keys from separate file to avoid circular dependency
import { leaseQueries } from './query-keys/lease-keys'

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch lease by ID
 * Uses placeholderData from list cache for instant detail view
 */
export function useLease(id: string) {
	return useEntityDetail<Lease>({
		queryOptions: leaseQueries.detail(id),
		listQueryKey: leaseQueries.lists(),
		id
	})
}

/**
 * Hook to fetch user's current active lease
 */
export function useCurrentLease() {
	return useQuery(leaseQueries.tenantPortalActive())
}

/**
 * Hook to fetch lease list with pagination and filtering
 */
export function useLeaseList(params?: {
	status?: string
	search?: string
	limit?: number
	offset?: number
}) {
	const { status, search, limit = 50, offset = 0 } = params || {}
	const queryClient = useQueryClient()

	const listQuery = leaseQueries.list({
		...(status && { status }),
		...(search && { search }),
		limit,
		offset
	})

	const query = useQuery({
		...listQuery,
		structuralSharing: true
	})

	useEffect(() => {
		if (query.data?.data) {
			for (const lease of query.data.data) {
				queryClient.setQueryData(leaseQueries.detail(lease.id).queryKey, lease)
			}
		}
	}, [query.data, queryClient])

	return query
}

/**
 * Hook to fetch expiring leases
 */
export function useExpiringLeases(daysUntilExpiry: number = 30) {
	return useQuery(leaseQueries.expiring(daysUntilExpiry))
}

/**
 * Hook to fetch lease statistics
 */
export function useLeaseStats() {
	return useQuery(leaseQueries.stats())
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Declarative prefetch hook for lease detail
 * Prefetches when component mounts (route-level prefetching)
 *
 * For imperative prefetching (e.g., on hover), use:
 * queryClient.prefetchQuery(leaseQueries.detail(id))
 */
export function usePrefetchLeaseDetail(id: string) {
	usePrefetchQuery(leaseQueries.detail(id))
}

/**
 * Hook to fetch signature status for a lease
 */
export function useLeaseSignatureStatus(leaseId: string) {
	return useQuery(leaseQueries.signatureStatus(leaseId))
}

/**
 * Hook to get signed document URL for download.
 * Reads docuseal_submission_id, owner_signed_at, tenant_signed_at from leases table.
 * Returns a pending: prefix URL when submission exists and both parties signed.
 * Full signed document URL is wired up in Phase 55-03 (docuseal-webhook plan).
 */
export function useSignedDocumentUrl(leaseId: string, enabled = true) {
	return useQuery(leaseQueries.signedDocument(leaseId, enabled))
}
