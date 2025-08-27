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
	CreateLeaseInput,
	UpdateLeaseInput,
	LeaseStats
} from '@repo/shared'
import { leaseApi } from '@/lib/api/leases'
import { queryKeys } from '@/lib/react-query/query-keys'
import { useOptimisticList, useOptimisticItem } from '@/hooks/use-react19-optimistic'

// ============================================================================
// PURE DATA HOOKS - TanStack Query Suspense (No Optimistic Logic)
// ============================================================================

/**
 * PURE: useSuspenseQuery for leases list - data always available
 */
export function useLeases(query?: LeaseQuery): UseSuspenseQueryResult<Lease[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.leases.list(query),
		queryFn: async () => leaseApi.getAll(query),
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
		queryFn: async () => leaseApi.getById(id),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for leases by property - data always available
 */
export function useLeasesByProperty(propertyId: string): UseSuspenseQueryResult<Lease[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.leases.byProperty(propertyId),
		queryFn: async () => leaseApi.getByProperty(propertyId),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for lease statistics - perfect for dashboards
 */
export function useLeaseStats(): UseSuspenseQueryResult<LeaseStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.leases.stats(),
		queryFn: async () => leaseApi.getStats(),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

// ============================================================================
// REACT 19 OPTIMISTIC MUTATIONS - Pure useOptimistic Integration
// ============================================================================

/**
 * React 19 useOptimistic for Leases List - Replaces TanStack Query onMutate
 */
export function useLeasesOptimistic(query?: LeaseQuery) {
	const { data: serverLeases } = useLeases(query)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for instant feedback
	const optimistic = useOptimisticList(serverLeases, {
		successMessage: (lease: Lease) => `Lease for ${lease.property?.name || 'property'} saved successfully`,
		errorMessage: 'Failed to save lease',
		onSuccess: () => {
			// Invalidate server cache after successful operations
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
		}
	})

	// Server action wrappers
	const createLeaseServer = async (data: CreateLeaseInput): Promise<Lease> => {
		return await leaseApi.create(data)
	}

	const updateLeaseServer = async (id: string, data: UpdateLeaseInput): Promise<Lease> => {
		return await leaseApi.update(id, data)
	}

	const deleteLeaseServer = async (id: string): Promise<void> => {
		await leaseApi.delete(id)
	}

	return {
		// React 19 optimistic state
		leases: optimistic.items,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,
		pendingCount: optimistic.pendingCount,

		// React 19 optimistic actions
		createLease: (data: CreateLeaseInput) => 
			optimistic.optimisticCreate(data, createLeaseServer),
		updateLease: (id: string, data: UpdateLeaseInput) => 
			optimistic.optimisticUpdate(id, data, updateLeaseServer),
		deleteLease: (id: string) => 
			optimistic.optimisticDelete(id, () => deleteLeaseServer(id)),
		
		// Utility actions
		revertAll: optimistic.revertAll
	}
}

/**
 * React 19 useOptimistic for Single Lease - Pure item updates
 */
export function useLeaseOptimistic(id: string) {
	const { data: serverLease } = useLease(id)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for single lease
	const optimistic = useOptimisticItem(serverLease, {
		successMessage: 'Lease updated successfully',
		errorMessage: 'Failed to update lease',
		onSuccess: () => {
			// Invalidate related caches
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
		}
	})

	// Server action wrapper
	const updateLeaseServer = async (data: UpdateLeaseInput): Promise<Lease> => {
		return await leaseApi.update(id, data)
	}

	return {
		// React 19 optimistic state
		lease: optimistic.item,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,

		// React 19 optimistic actions
		updateLease: (data: UpdateLeaseInput) => 
			optimistic.optimisticUpdate(data, updateLeaseServer),
		revert: optimistic.revert
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
			queryFn: async () => leaseApi.getById(id),
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