import { useEffect } from 'react'
import { usePrefetchQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lease } from '#types/core'
import { useEntityDetail } from '#hooks/use-entity-detail'
import { leaseQueries } from './query-keys/lease-keys'

// Uses placeholderData from list cache for instant detail view
export function useLease(id: string) {
	return useEntityDetail<Lease>({
		queryOptions: leaseQueries.detail(id),
		listQueryKey: leaseQueries.lists(),
		id
	})
}

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

export function useExpiringLeases(daysUntilExpiry: number = 30) {
	return useQuery(leaseQueries.expiring(daysUntilExpiry))
}

export function useLeaseStats() {
	return useQuery(leaseQueries.stats())
}

// Declarative prefetch on mount. For hover/imperative prefetch, call queryClient.prefetchQuery directly.
export function usePrefetchLeaseDetail(id: string) {
	usePrefetchQuery(leaseQueries.detail(id))
}

export function useLeaseSignatureStatus(leaseId: string) {
	return useQuery(leaseQueries.signatureStatus(leaseId))
}

// Returns a `pending:` prefix URL when both parties have signed but the webhook-driven URL
// hasn't been wired up yet.
export function useSignedDocumentUrl(leaseId: string, enabled = true) {
	return useQuery(leaseQueries.signedDocument(leaseId, enabled))
}
