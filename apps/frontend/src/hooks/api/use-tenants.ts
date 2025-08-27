/**
 * React 19 + TanStack Query v5 Tenants Hooks - Pure useOptimistic Implementation
 * ARCHITECTURE: React 19 useOptimistic is the ONLY pattern - no legacy TanStack Query mutations
 * PURE: Combines native React 19 optimistic updates with TanStack Query Suspense
 */
import {
	useSuspenseQuery,
	useQueryClient,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	Tenant,
	TenantQuery,
	CreateTenantInput,
	UpdateTenantInput,
	TenantStats
} from '@repo/shared'
import { get, post, put, del } from '@/lib/api-client-temp'
import { queryKeys } from '@/lib/react-query/query-keys'

// ============================================================================
// PURE DATA HOOKS - TanStack Query Suspense (No Optimistic Logic)
// ============================================================================

/**
 * PURE: useSuspenseQuery for tenants list - data always available
 */
export function useTenants(query?: TenantQuery): UseSuspenseQueryResult<Tenant[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.tenants.list(query),
		queryFn: async () => get<Tenant[]>('/api/tenants'),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * PURE: useSuspenseQuery for single tenant - no loading states needed
 */
export function useTenant(id: string): UseSuspenseQueryResult<Tenant> {
	return useSuspenseQuery({
		queryKey: queryKeys.tenants.detail(id),
		queryFn: async () => get<Tenant>(`/api/tenants/${id}`),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for tenant statistics - perfect for dashboards
 */
export function useTenantStats(): UseSuspenseQueryResult<TenantStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.tenants.stats(),
		queryFn: async () => get<TenantStats>('/api/tenants/stats'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

// ============================================================================
// REACT 19 OPTIMISTIC MUTATIONS - Pure useOptimistic Integration
// ============================================================================

/**
 * React 19 useOptimistic for Tenants List - Replaces TanStack Query onMutate
 */
export function useTenantsOptimistic(query?: TenantQuery) {
	const { data: serverTenants } = useTenants(query)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for instant feedback
	const optimistic = useOptimisticList(serverTenants, {
		successMessage: (tenant: Tenant) => `${tenant.firstName || 'Tenant'} ${tenant.lastName || ''} saved successfully`,
		errorMessage: 'Failed to save tenant',
		onSuccess: () => {
			// Invalidate server cache after successful operations
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.stats()
			})
		}
	})

	// Server action wrappers
	const createTenantServer = async (data: CreateTenantInput): Promise<Tenant> => {
		return await post<Tenant>('/api/tenants', data)
	}

	const updateTenantServer = async (id: string, data: UpdateTenantInput): Promise<Tenant> => {
		return await put<Tenant>(`/api/tenants/${id}`, data)
	}

	const deleteTenantServer = async (id: string): Promise<void> => {
		await del<void>(`/api/tenants/${id}`)
	}

	return {
		// React 19 optimistic state
		tenants: optimistic.items,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,
		pendingCount: optimistic.pendingCount,

		// React 19 optimistic actions
		createTenant: (data: CreateTenantInput) => 
			optimistic.optimisticCreate(data, createTenantServer),
		updateTenant: (id: string, data: UpdateTenantInput) => 
			optimistic.optimisticUpdate(id, data, updateTenantServer),
		deleteTenant: (id: string) => 
			optimistic.optimisticDelete(id, () => deleteTenantServer(id)),
		
		// Utility actions
		revertAll: optimistic.revertAll
	}
}

/**
 * React 19 useOptimistic for Single Tenant - Pure item updates
 */
export function useTenantOptimistic(id: string) {
	const { data: serverTenant } = useTenant(id)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for single tenant
	const optimistic = useOptimisticItem(serverTenant, {
		successMessage: 'Tenant updated successfully',
		errorMessage: 'Failed to update tenant',
		onSuccess: () => {
			// Invalidate related caches
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.stats()
			})
		}
	})

	// Server action wrapper
	const updateTenantServer = async (data: UpdateTenantInput): Promise<Tenant> => {
		return await put<Tenant>(`/api/tenants/${id}`, data)
	}

	return {
		// React 19 optimistic state
		tenant: optimistic.item,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,

		// React 19 optimistic actions
		updateTenant: (data: UpdateTenantInput) => 
			optimistic.optimisticUpdate(data, updateTenantServer),
		revert: optimistic.revert
	}
}


// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * PURE: Enhanced prefetch for Suspense patterns - ensures data available when component mounts
 */
export function usePrefetchTenant() {
	const queryClient = useQueryClient()

	return (id: string) => {
		void queryClient.prefetchQuery({
			queryKey: queryKeys.tenants.detail(id),
			queryFn: async () => get<Tenant>(`/api/tenants/${id}`),
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