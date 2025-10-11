/**
 * Properties Hooks
 * TanStack Query hooks for properties management
 */

import type { Property } from '@repo/shared/types/core'
import { apiClient } from '@repo/shared/utils/api-client'
import { useQuery } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

// Query keys (hierarchical, typed)
export const propertiesKeys = {
	all: ['properties'] as const,
	list: (params?: {
		search?: string | null
		limit?: number
		offset?: number
	}) => [...propertiesKeys.all, 'list', params] as const,
	detail: (id: string) => [...propertiesKeys.all, 'detail', id] as const
}

/**
 * Hook to fetch all properties for the authenticated user
 * Supports pagination and search
 */
export function useProperties(params?: {
	search?: string | null
	limit?: number
	offset?: number
}) {
	const { search = null, limit = 10, offset = 0 } = params || {}

	return useQuery({
		queryKey: propertiesKeys.list({ search, limit, offset }),
		queryFn: async () => {
			const searchParams = new URLSearchParams()
			if (search) searchParams.append('search', search)
			searchParams.append('limit', limit.toString())
			searchParams.append('offset', offset.toString())

			const url = `${API_BASE_URL}/api/v1/properties?${searchParams.toString()}`
			const response = await apiClient<Property[]>(url)
			return response
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}

/**
 * Hook to fetch recent properties (limit 5)
 * Optimized for dashboard display
 */
export function useRecentProperties() {
	return useProperties({ limit: 5, offset: 0 })
}
