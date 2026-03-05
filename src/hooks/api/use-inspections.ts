/**
 * Inspection Query Hooks
 * TanStack Query hooks for inspection data fetching.
 *
 * Query keys are in a separate file to avoid circular dependencies.
 * Mutation hooks (CRUD, rooms, photos) are in use-inspection-mutations.ts.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useQuery } from '@tanstack/react-query'
import { inspectionQueries } from './query-keys/inspection-keys'

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all inspections for the current owner
 */
export function useInspections() {
	return useQuery(inspectionQueries.list())
}

/**
 * Hook to fetch inspections for a specific lease
 */
export function useInspectionsByLease(leaseId: string) {
	return useQuery(inspectionQueries.byLeaseQuery(leaseId))
}

/**
 * Hook to fetch a single inspection with rooms and photos
 */
export function useInspection(id: string) {
	return useQuery(inspectionQueries.detailQuery(id))
}
