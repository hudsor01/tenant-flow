/**
 * React 19 + TanStack Query v5 Properties Hooks - Pure useOptimistic Implementation
 * ARCHITECTURE: React 19 useOptimistic is the ONLY pattern - no legacy TanStack Query mutations
 * PURE: Combines native React 19 optimistic updates with TanStack Query Suspense
 */
import { useState } from 'react'
import {
	useSuspenseQuery,
	useQueryClient,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	Property,
	PropertyWithUnits,
	PropertyQuery,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyStats
} from '@repo/shared'
import { get, post, put, del } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-keys'
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints'

// ============================================================================
// PURE DATA HOOKS - TanStack Query Suspense (No Optimistic Logic)
// ============================================================================

/**
 * PURE: useSuspenseQuery for properties with units - includes calculated stats
 * This is the primary hook for fetching properties with their units for stat calculations
 */
export function usePropertiesWithUnits(
	query?: PropertyQuery
): UseSuspenseQueryResult<PropertyWithUnits[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.properties.list(query),
		queryFn: async () =>
			get<PropertyWithUnits[]>(API_ENDPOINTS.PROPERTIES.WITH_UNITS),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * PURE: useSuspenseQuery for properties list - data always available
 * Legacy hook - prefer usePropertiesWithUnits for components that need stats
 */
export function useProperties(
	query?: PropertyQuery
): UseSuspenseQueryResult<PropertyWithUnits[]> {
	// Use the with-units endpoint to get properties with their units
	return usePropertiesWithUnits(query)
}

/**
 * PURE: useSuspenseQuery for single property with units - no loading states needed
 */
export function useProperty(id: string): UseSuspenseQueryResult<PropertyWithUnits> {
	return useSuspenseQuery({
		queryKey: queryKeys.properties.detail(id),
		queryFn: async () => get<PropertyWithUnits>(API_ENDPOINTS.PROPERTIES.BY_ID(id)),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for property statistics - perfect for dashboards
 */
export function usePropertyStats(): UseSuspenseQueryResult<PropertyStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.properties.stats(),
		queryFn: async () => get<PropertyStats>(API_ENDPOINTS.PROPERTIES.STATS),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

// ============================================================================
// REACT 19 OPTIMISTIC MUTATIONS - Pure useOptimistic Integration
// ============================================================================

/**
 * Simple Properties Hook - KISS Principle: Use direct patterns in components
 * REMOVED: Complex optimistic abstractions
 * PATTERN: Components should use useOptimistic directly
 */
export function usePropertiesOptimistic(query?: PropertyQuery) {
	const { data: serverProperties } = useProperties(query)
	const queryClient = useQueryClient()
	
	const createProperty = async (input: CreatePropertyInput) => {
		const result = await post<PropertyWithUnits>(API_ENDPOINTS.PROPERTIES.BASE, input)
		await queryClient.invalidateQueries({
			queryKey: queryKeys.properties.lists()
		})
		await queryClient.invalidateQueries({
			queryKey: queryKeys.properties.stats()
		})
		return result
	}
	
	const updateProperty = async (id: string, input: UpdatePropertyInput) => {
		const result = await put<PropertyWithUnits>(API_ENDPOINTS.PROPERTIES.BY_ID(id), input)
		await queryClient.invalidateQueries({
			queryKey: queryKeys.properties.detail(id)
		})
		await queryClient.invalidateQueries({
			queryKey: queryKeys.properties.lists()
		})
		await queryClient.invalidateQueries({
			queryKey: queryKeys.properties.stats()
		})
		return result
	}
	
	const deleteProperty = async (id: string) => {
		const result = await del(API_ENDPOINTS.PROPERTIES.BY_ID(id))
		await queryClient.invalidateQueries({
			queryKey: queryKeys.properties.lists()
		})
		await queryClient.invalidateQueries({
			queryKey: queryKeys.properties.stats()
		})
		return result
	}
	
	return {
		properties: serverProperties,
		isPending: false,
		createProperty,
		updateProperty,
		deleteProperty
	}
}

/**
 * Simple Property Hook - KISS Principle
 */
export function usePropertyOptimistic(id: string) {
	const { data: serverProperty } = useProperty(id)
	
	return {
		property: serverProperty,
		isPending: false
	}
}


// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * PURE: Enhanced prefetch for Suspense patterns - ensures data available when component mounts
 * Uses generic implementation to avoid duplication
 */
export { usePrefetchProperty } from './use-prefetch-resource'

// ============================================================================
// EXPORTS - React 19 Pure Implementation
// ============================================================================

// REACT 19: Pure useOptimistic patterns (exported directly above)

// REACT 19: Pure data fetching (exported directly above)

// REACT 19: Utilities (exported directly above)

// ============================================================================
// COMPATIBILITY EXPORTS - Bridge for components expecting mutation API
// ============================================================================

/**
 * Compatibility wrapper for components expecting TanStack Query mutation API
 */
export function useCreateProperty() {
	const queryClient = useQueryClient()
	const [isPending, setIsPending] = useState(false)
	
	return {
		isPending,
		mutateAsync: async (data: CreatePropertyInput) => {
			setIsPending(true)
			try {
				const result = await post<Property>(API_ENDPOINTS.PROPERTIES.BASE, data)
				await queryClient.invalidateQueries({
					queryKey: queryKeys.properties.lists()
				})
				await queryClient.invalidateQueries({
					queryKey: queryKeys.properties.stats()
				})
				return result
			} finally {
				setIsPending(false)
			}
		}
	}
}

/**
 * Compatibility wrapper for components expecting TanStack Query mutation API
 */
export function useUpdateProperty() {
	const queryClient = useQueryClient()
	const [isPending, setIsPending] = useState(false)
	
	return {
		isPending,
		mutateAsync: async ({ id, data }: { id: string; data: UpdatePropertyInput }) => {
			setIsPending(true)
			try {
				const result = await put<Property>(API_ENDPOINTS.PROPERTIES.BY_ID(id), data)
				await queryClient.invalidateQueries({
					queryKey: queryKeys.properties.detail(id)
				})
				await queryClient.invalidateQueries({
					queryKey: queryKeys.properties.lists()
				})
				await queryClient.invalidateQueries({
					queryKey: queryKeys.properties.stats()
				})
				return result
			} finally {
				setIsPending(false)
			}
		}
	}
}