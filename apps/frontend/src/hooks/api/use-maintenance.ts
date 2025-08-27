/**
 * React 19 + TanStack Query v5 Maintenance Hooks - Pure useOptimistic Implementation
 * ARCHITECTURE: React 19 useOptimistic is the ONLY pattern - no legacy TanStack Query mutations
 * PURE: Combines native React 19 optimistic updates with TanStack Query Suspense
 */
import {
	useSuspenseQuery,
	useQueryClient,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	MaintenanceRequest,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
	MaintenanceStatus
} from '@repo/shared'
import { maintenanceApi } from '@/lib/api/maintenance'
import { queryKeys } from '@/lib/react-query/query-keys'
import { useOptimisticList, useOptimisticItem } from '@/hooks/use-optimistic-data'

// ============================================================================
// PURE DATA HOOKS - TanStack Query Suspense (No Optimistic Logic)
// ============================================================================

/**
 * PURE: useSuspenseQuery for maintenance requests - data always available
 */
export function useMaintenanceRequests(
	params?: {
		status?: MaintenanceStatus
		priority?: string
		propertyId?: string
		unitId?: string
	}
): UseSuspenseQueryResult<MaintenanceRequest[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.maintenance.list(params),
		queryFn: async () => maintenanceApi.getAll(params),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * PURE: useSuspenseQuery for single maintenance request - no loading states needed
 */
export function useMaintenanceRequest(id: string): UseSuspenseQueryResult<MaintenanceRequest> {
	return useSuspenseQuery({
		queryKey: queryKeys.maintenance.detail(id),
		queryFn: async () => maintenanceApi.getById(id),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for maintenance statistics - perfect for dashboards
 */
export function useMaintenanceStats(): UseSuspenseQueryResult<Record<string, unknown>> {
	return useSuspenseQuery({
		queryKey: queryKeys.maintenance.stats(),
		queryFn: async () => maintenanceApi.getStats(),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

// ============================================================================
// REACT 19 OPTIMISTIC MUTATIONS - Pure useOptimistic Integration
// ============================================================================

/**
 * React 19 useOptimistic for Maintenance Requests List - Replaces TanStack Query onMutate
 */
export function useMaintenanceRequestsOptimistic(
	params?: {
		status?: MaintenanceStatus
		priority?: string
		propertyId?: string
		unitId?: string
	}
) {
	const { data: serverRequests } = useMaintenanceRequests(params)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for instant feedback
	const optimistic = useOptimisticList(serverRequests, {
		successMessage: (request: MaintenanceRequest) => `Maintenance request #${request.id} saved successfully`,
		errorMessage: 'Failed to save maintenance request',
		onSuccess: () => {
			// Invalidate server cache after successful operations
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.stats()
			})
		}
	})

	// Server action wrappers
	const createMaintenanceServer = async (data: CreateMaintenanceInput): Promise<MaintenanceRequest> => {
		return await maintenanceApi.create(data)
	}

	const updateMaintenanceServer = async (id: string, data: UpdateMaintenanceInput): Promise<MaintenanceRequest> => {
		return await maintenanceApi.update(id, data)
	}

	const deleteMaintenanceServer = async (id: string): Promise<void> => {
		await maintenanceApi.delete(id)
	}

	return {
		// React 19 optimistic state
		maintenanceRequests: optimistic.items,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,
		pendingCount: optimistic.pendingCount,

		// React 19 optimistic actions
		createMaintenanceRequest: (data: CreateMaintenanceInput) => 
			optimistic.optimisticCreate(data, createMaintenanceServer),
		updateMaintenanceRequest: (id: string, data: UpdateMaintenanceInput) => 
			optimistic.optimisticUpdate(id, data, updateMaintenanceServer),
		deleteMaintenanceRequest: (id: string) => 
			optimistic.optimisticDelete(id, () => deleteMaintenanceServer(id)),
		
		// Utility actions
		revertAll: optimistic.revertAll
	}
}

/**
 * React 19 useOptimistic for Single Maintenance Request - Pure item updates
 */
export function useMaintenanceRequestOptimistic(id: string) {
	const { data: serverRequest } = useMaintenanceRequest(id)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for single maintenance request
	const optimistic = useOptimisticItem(serverRequest, {
		successMessage: 'Maintenance request updated successfully',
		errorMessage: 'Failed to update maintenance request',
		onSuccess: () => {
			// Invalidate related caches
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.stats()
			})
		}
	})

	// Server action wrapper
	const updateMaintenanceServer = async (data: UpdateMaintenanceInput): Promise<MaintenanceRequest> => {
		return await maintenanceApi.update(id, data)
	}

	return {
		// React 19 optimistic state
		maintenanceRequest: optimistic.item,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,

		// React 19 optimistic actions
		updateMaintenanceRequest: (data: UpdateMaintenanceInput) => 
			optimistic.optimisticUpdate(data, updateMaintenanceServer),
		revert: optimistic.revert
	}
}


// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * PURE: Enhanced prefetch for Suspense patterns - ensures data available when component mounts
 */
export function usePrefetchMaintenanceRequest() {
	const queryClient = useQueryClient()

	return (id: string) => {
		void queryClient.prefetchQuery({
			queryKey: queryKeys.maintenance.detail(id),
			queryFn: async () => maintenanceApi.getById(id),
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