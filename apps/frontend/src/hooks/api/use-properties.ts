/**
 * React Query hooks for Properties
 * Direct TanStack Query usage - no factory abstractions
 */
import {
	type UseQueryResult,
	type UseMutationResult,
	useQuery,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type {
	Property,
	PropertyQuery,
	CreatePropertyInput,
	UpdatePropertyInput
} from '@repo/shared'
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'

/**
 * Fetch list of properties with optional filters
 */
export function useProperties(
	query?: PropertyQuery,
	options?: { enabled?: boolean }
): UseQueryResult<Property[], Error> {
	return useQuery({
		queryKey: ['tenantflow', 'properties', 'list', query],
		queryFn: async () => {
			try {
				const response = await apiClient.get<Property[]>(
					'/properties',
					{
						params: createQueryAdapter(query)
					}
				)
				return response
			} catch {
				logger.warn(
					'Properties API unavailable, returning empty list',
					{ component: 'UpropertiesHook' }
				)
				return [] // Return empty array on error to allow UI to render
			}
		},
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000
	})
}

/**
 * Fetch single property by ID
 */
export function useProperty(
	id: string,
	options?: { enabled?: boolean }
): UseQueryResult<Property, Error> {
	return useQuery({
		queryKey: queryKeys.propertyDetail(id),
		queryFn: async () => {
			if (!id) throw new Error('Property ID is required')
			return await apiClient.get<Property>(`/properties/${id}`)
		},
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000
	})
}

/**
 * Fetch property statistics
 */
export function usePropertyStats(): UseQueryResult<
	{
		total: number
		occupied: number
		vacant: number
		occupancyRate: number
		totalMonthlyRent: number
		averageRent: number
	},
	Error
> {
	return useQuery({
		queryKey: queryKeys.propertyStats(),
		queryFn: async () => {
			return await apiClient.get<{
				total: number
				occupied: number
				vacant: number
				occupancyRate: number
				totalMonthlyRent: number
				averageRent: number
			}>('/properties/stats')
		},
		enabled: true,
		refetchInterval: 5 * 60 * 1000, // 5 minutes
		staleTime: 2 * 60 * 1000
	})
}

/**
 * Create new property - simplified without complex optimistic updates
 */
export function useCreateProperty(): UseMutationResult<
	Property,
	Error,
	CreatePropertyInput
> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (data: CreatePropertyInput) => {
			const response = await apiClient.post<Property>(
				'/properties',
				createMutationAdapter(data)
			)
			return response
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.properties() })
			queryClient.invalidateQueries({ queryKey: queryKeys.propertyStats() })
			toast.success('Property created successfully')
		},
		onError: () => {
			toast.error('Failed to create property')
		}
	})
}

/**
 * Update property - simplified without complex optimistic updates
 */
export function useUpdateProperty(): UseMutationResult<
	Property,
	Error,
	{ id: string; data: UpdatePropertyInput }
> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async ({ id, data }) => {
			const response = await apiClient.put<Property>(
				`/properties/${id}`,
				createMutationAdapter(data)
			)
			return response
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.properties() })
			queryClient.invalidateQueries({ queryKey: queryKeys.propertyStats() })
			toast.success('Property updated successfully')
		},
		onError: () => {
			toast.error('Failed to update property')
		}
	})
}

/**
 * Delete property - simplified without complex optimistic updates
 */
export function useDeleteProperty(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/properties/${id}`)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.properties() })
			queryClient.invalidateQueries({ queryKey: queryKeys.propertyStats() })
			toast.success('Property deleted successfully')
		},
		onError: () => {
			toast.error('Failed to delete property')
		}
	})
}

/**
 * Prefetch property data (for hover effects, etc.)
 */
export function usePrefetchProperty() {
	const queryClient = useQueryClient()

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: queryKeys.propertyDetail(id),
			queryFn: async () => {
				return await apiClient.get<Property>(
					`/properties/${id}`
				)
			},
			staleTime: 10 * 1000 // Consider data stale after 10 seconds
		})
	}
}
