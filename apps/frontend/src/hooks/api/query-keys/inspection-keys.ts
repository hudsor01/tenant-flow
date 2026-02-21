/**
 * Inspection Query Keys & Options
 * Extracted to avoid circular dependencies and enable reuse across files
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - AbortSignal for query cancellation
 */

import { queryOptions } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { Inspection, InspectionListItem } from '@repo/shared/types/sections/inspections'

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Inspection query factory
 */
export const inspectionQueries = {
	all: () => ['inspections'] as const,
	lists: () => [...inspectionQueries.all(), 'list'] as const,
	byLease: (leaseId: string) => [...inspectionQueries.all(), 'lease', leaseId] as const,
	details: () => [...inspectionQueries.all(), 'detail'] as const,
	detail: (id: string) => [...inspectionQueries.details(), id] as const,

	list: () =>
		queryOptions({
			queryKey: inspectionQueries.lists(),
			queryFn: ({ signal }) =>
				apiRequest<InspectionListItem[]>('/api/v1/inspections', { signal }),
			...QUERY_CACHE_TIMES.LIST
		}),

	byLeaseQuery: (leaseId: string) =>
		queryOptions({
			queryKey: inspectionQueries.byLease(leaseId),
			queryFn: ({ signal }) =>
				apiRequest<Inspection[]>(`/api/v1/inspections/by-lease/${leaseId}`, {
					signal
				}),
			enabled: !!leaseId,
			...QUERY_CACHE_TIMES.DETAIL
		}),

	detailQuery: (id: string) =>
		queryOptions({
			queryKey: inspectionQueries.detail(id),
			queryFn: ({ signal }) =>
				apiRequest<Inspection>(`/api/v1/inspections/${id}`, { signal }),
			enabled: !!id,
			...QUERY_CACHE_TIMES.DETAIL
		})
}
