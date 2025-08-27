/**
 * React 19 + TanStack Query v5 Properties Hooks - Pure useOptimistic Implementation
 * ARCHITECTURE: React 19 useOptimistic is the ONLY pattern - no legacy TanStack Query mutations
 * PURE: Combines native React 19 optimistic updates with TanStack Query Suspense
 */
import {
	useSuspenseQuery,
	useQueryClient,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	Property,
	PropertyQuery,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyStats
} from '@repo/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-keys'
import { useOptimisticList, useOptimisticItem } from '@/hooks/use-react19-optimistic'

// ============================================================================
// PURE DATA HOOKS - TanStack Query Suspense (No Optimistic Logic)
// ============================================================================

/**
 * PURE: useSuspenseQuery for properties list - data always available
 */
export function useProperties(
	query?: PropertyQuery
): UseSuspenseQueryResult<Property[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.properties.list(query),
		queryFn: async () =>
			apiClient.get<Property[]>('/properties', { params: query }),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * PURE: useSuspenseQuery for single property - no loading states needed
 */
export function useProperty(id: string): UseSuspenseQueryResult<Property> {
	return useSuspenseQuery({
		queryKey: queryKeys.properties.detail(id),
		queryFn: async () => apiClient.get<Property>(`/properties/${id}`),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for property statistics - perfect for dashboards
 */
export function usePropertyStats(): UseSuspenseQueryResult<PropertyStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.properties.stats(),
		queryFn: async () => apiClient.get<PropertyStats>('/properties/stats'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

// ============================================================================
// REACT 19 OPTIMISTIC MUTATIONS - Pure useOptimistic Integration
// ============================================================================

/**
 * React 19 useOptimistic for Properties List - Replaces TanStack Query onMutate
 */
export function usePropertiesOptimistic(query?: PropertyQuery) {
	const { data: serverProperties } = useProperties(query)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for instant feedback
	const optimistic = useOptimisticList(serverProperties, {
		successMessage: (property: Property) => `${property.name || 'Property'} saved successfully`,
		errorMessage: 'Failed to save property',
		onSuccess: () => {
			// Invalidate server cache after successful operations
			void queryClient.invalidateQueries({
				queryKey: queryKeys.properties.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.properties.stats()
			})
		}
	})

	// Server action wrappers
	const createPropertyServer = async (data: CreatePropertyInput): Promise<Property> => {
		return await apiClient.post<Property>('/properties', data)
	}

	const updatePropertyServer = async (id: string, data: UpdatePropertyInput): Promise<Property> => {
		return await apiClient.put<Property>(`/properties/${id}`, data)
	}

	const deletePropertyServer = async (id: string): Promise<void> => {
		await apiClient.delete<void>(`/properties/${id}`)
	}

	return {
		// React 19 optimistic state
		properties: optimistic.items,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,
		pendingCount: optimistic.pendingCount,

		// React 19 optimistic actions
		createProperty: (data: CreatePropertyInput) => 
			optimistic.optimisticCreate(data, createPropertyServer),
		updateProperty: (id: string, data: UpdatePropertyInput) => 
			optimistic.optimisticUpdate(id, data, updatePropertyServer),
		deleteProperty: (id: string) => 
			optimistic.optimisticDelete(id, () => deletePropertyServer(id)),
		
		// Utility actions
		revertAll: optimistic.revertAll
	}
}

/**
 * React 19 useOptimistic for Single Property - Pure item updates
 */
export function usePropertyOptimistic(id: string) {
	const { data: serverProperty } = useProperty(id)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for single property
	const optimistic = useOptimisticItem(serverProperty, {
		successMessage: 'Property updated successfully',
		errorMessage: 'Failed to update property',
		onSuccess: () => {
			// Invalidate related caches
			void queryClient.invalidateQueries({
				queryKey: queryKeys.properties.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.properties.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.properties.stats()
			})
		}
	})

	// Server action wrapper
	const updatePropertyServer = async (data: UpdatePropertyInput): Promise<Property> => {
		return await apiClient.put<Property>(`/properties/${id}`, data)
	}

	return {
		// React 19 optimistic state
		property: optimistic.item,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,

		// React 19 optimistic actions
		updateProperty: (data: UpdatePropertyInput) => 
			optimistic.optimisticUpdate(data, updatePropertyServer),
		revert: optimistic.revert
	}
}


// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * PURE: Enhanced prefetch for Suspense patterns - ensures data available when component mounts
 */
export function usePrefetchProperty() {
	const queryClient = useQueryClient()

	return (id: string) => {
		void queryClient.prefetchQuery({
			queryKey: queryKeys.properties.detail(id),
			queryFn: async () => apiClient.get<Property>(`/properties/${id}`),
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