/**
 * Unit Query Options (TanStack Query v5 Pattern)
 *
 * Uses native fetch for NestJS calls.
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'
import type { Unit, UnitStats } from '@repo/shared/types/core'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'

/**
 * Unit query filters
 */
export interface UnitFilters {
	property_id?: string
	status?: 'available' | 'occupied' | 'maintenance' | 'reserved'
	search?: string
	limit?: number
	offset?: number
}

/**
 * Unit query factory
 */
export const unitQueries = {
	all: () => ['units'] as const,
	lists: () => [...unitQueries.all(), 'list'] as const,

	list: (filters?: UnitFilters) =>
		queryOptions({
			queryKey: [...unitQueries.lists(), filters ?? {}],
			queryFn: async () => {
				const searchParams = new URLSearchParams()
				if (filters?.property_id) searchParams.append('property_id', filters.property_id)
				if (filters?.status) searchParams.append('status', filters.status)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit) searchParams.append('limit', filters.limit.toString())
				if (filters?.offset) searchParams.append('offset', filters.offset.toString())
				const params = searchParams.toString()
				return apiRequest<PaginatedResponse<Unit>>(`/api/v1/units${params ? `?${params}` : ''}`)
			},
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	listByProperty: (property_id: string) =>
		queryOptions({
			queryKey: [...unitQueries.lists(), 'by-property', property_id],
			queryFn: async () => {
				const response = await apiRequest<PaginatedResponse<Unit>>(`/api/v1/units?property_id=${property_id}`)
				return response.data
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id,
		}),

	details: () => [...unitQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...unitQueries.details(), id],
			queryFn: () => apiRequest<Unit>(`/api/v1/units/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	byProperty: (property_id: string) =>
		queryOptions({
			queryKey: [...unitQueries.all(), 'by-property', property_id],
			queryFn: () => apiRequest<Unit[]>(`/api/v1/units/by-property/${property_id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id,
		}),

	stats: () =>
		queryOptions({
			queryKey: [...unitQueries.all(), 'stats'],
			queryFn: () => apiRequest<UnitStats>('/api/v1/units/stats'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000,
		}),
}
