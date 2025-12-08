/**
 * Maintenance Request Query Options (TanStack Query v5 Pattern)
 *
 * Uses native fetch for NestJS calls.
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'

/**
 * Maintenance query filters
 */
export interface MaintenanceFilters {
	unit_id?: string
	property_id?: string
	priority?: string
	category?: string
	status?: string
	limit?: number
	offset?: number
}

/**
 * Maintenance query factory
 */
export const maintenanceQueries = {
	all: () => ['maintenance'] as const,
	lists: () => [...maintenanceQueries.all(), 'list'] as const,

	list: (filters?: MaintenanceFilters) =>
		queryOptions({
			queryKey: [...maintenanceQueries.lists(), filters ?? {}],
			queryFn: async () => {
				const params = new URLSearchParams()
				if (filters?.unit_id) params.append('unit_id', filters.unit_id)
				if (filters?.property_id) params.append('property_id', filters.property_id)
				if (filters?.priority) params.append('priority', filters.priority)
				if (filters?.category) params.append('category', filters.category)
				if (filters?.status) params.append('status', filters.status)
				if (filters?.limit) params.append('limit', filters.limit.toString())
				if (filters?.offset) params.append('offset', filters.offset.toString())
				const queryString = params.toString()
				return apiRequest<PaginatedResponse<MaintenanceRequest>>(`/api/v1/maintenance${queryString ? `?${queryString}` : ''}`)
			},
			...QUERY_CACHE_TIMES.LIST,
		}),

	details: () => [...maintenanceQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...maintenanceQueries.details(), id],
			queryFn: () => apiRequest<MaintenanceRequest>(`/api/v1/maintenance/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	stats: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'stats'],
			queryFn: () => apiRequest('/api/v1/maintenance/stats'),
			...QUERY_CACHE_TIMES.STATS,
		}),

	urgent: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'urgent'],
			queryFn: () => apiRequest<MaintenanceRequest[]>('/api/v1/maintenance/urgent'),
			staleTime: 30 * 1000,
			gcTime: 5 * 60 * 1000,
		}),

	overdue: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'overdue'],
			queryFn: () => apiRequest<MaintenanceRequest[]>('/api/v1/maintenance/overdue'),
			...QUERY_CACHE_TIMES.STATS,
		}),

	tenantPortal: () =>
		queryOptions({
			queryKey: ['tenant-portal', 'maintenance'],
			queryFn: async (): Promise<{
				requests: MaintenanceRequest[]
				total: number
				open: number
				inProgress: number
				completed: number
			}> => {
				const response = await apiRequest<{
					requests: MaintenanceRequest[]
					summary: {
						total: number
						open: number
						inProgress: number
						completed: number
					}
				}>('/api/v1/tenants/maintenance')
				return {
					requests: response.requests,
					total: response.summary.total,
					open: response.summary.open,
					inProgress: response.summary.inProgress,
					completed: response.summary.completed,
				}
			},
			...QUERY_CACHE_TIMES.LIST,
		}),
}
