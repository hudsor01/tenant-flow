/**
 * React 19 + TanStack Query v5 Leases Hooks - Pure useOptimistic Implementation
 * ARCHITECTURE: React 19 useOptimistic is the ONLY pattern - no legacy TanStack Query mutations
 * PURE: Combines native React 19 optimistic updates with TanStack Query Suspense
 */
import {
	useSuspenseQuery,
	useQueryClient,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	Lease,
	LeaseQuery,
	LeaseStats
} from '@repo/shared'
import { get } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-keys'

// ============================================================================
// PURE DATA HOOKS - TanStack Query Suspense (No Optimistic Logic)
// ============================================================================

/**
 * PURE: useSuspenseQuery for leases list - data always available
 */
export function useLeases(query?: LeaseQuery): UseSuspenseQueryResult<Lease[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.leases.list(query),
		queryFn: async () => get<Lease[]>('/api/leases'),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * PURE: useSuspenseQuery for single lease - no loading states needed
 */
export function useLease(id: string): UseSuspenseQueryResult<Lease> {
	return useSuspenseQuery({
		queryKey: queryKeys.leases.detail(id),
		queryFn: async () => get<Lease>(`/api/leases/${id}`),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for leases by property - data always available
 */
export function useLeasesByProperty(propertyId: string): UseSuspenseQueryResult<Lease[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.leases.byProperty(propertyId),
		queryFn: async () => get<Lease[]>(`/api/properties/${propertyId}/leases`),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for lease statistics - perfect for dashboards
 */
export function useLeaseStats(): UseSuspenseQueryResult<LeaseStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.leases.stats(),
		queryFn: async () => get<LeaseStats>('/api/leases/stats'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

// ============================================================================
// REACT 19 OPTIMISTIC MUTATIONS - Pure useOptimistic Integration
// ============================================================================

/**
 * Simple Leases Hook - KISS Principle
 */
export function useLeasesOptimistic(query?: LeaseQuery) {
	const { data: serverLeases } = useLeases(query)
	
	return {
		leases: serverLeases,
		isPending: false
	}
}

/**
 * Simple Lease Hook - KISS Principle
 */
export function useLeaseOptimistic(id: string) {
	const { data: serverLease } = useLease(id)
	
	return {
		lease: serverLease,
		isPending: false
	}
}


// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * PURE: Enhanced prefetch for Suspense patterns - ensures data available when component mounts
 */
export function usePrefetchLease() {
	const queryClient = useQueryClient()

	return (id: string) => {
		void queryClient.prefetchQuery({
			queryKey: queryKeys.leases.detail(id),
			queryFn: async () => get<Lease>(`/api/leases/${id}`),
			staleTime: 10 * 1000 // 10 seconds
		})
	}
}

// ============================================================================
// EXPORTS - React 19 Pure Implementation
// ============================================================================

// REACT 19: Pure useOptimistic patterns (exported directly above)

// REACT 19: Pure data fetching (exported directly above)

// REACT 19: Utilities (exported directly above)