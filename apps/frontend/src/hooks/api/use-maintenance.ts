/**
 * Maintenance Request Hooks & Query Options
 * TanStack Query hooks for maintenance management with optimistic updates
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Colocated query options + hooks following the single-file pattern:
 * - Query factory with all maintenance queries
 * - Query hooks for data fetching
 * - Mutation hooks with optimistic updates
 */

import { useMemo } from 'react'
import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import type {
	MaintenanceRequest,
	MaintenanceRequestWithVersion
} from '@repo/shared/types/core'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import {
	handleConflictError,
	isConflictError,
	withVersion,
	incrementVersion
} from '@repo/shared/utils/optimistic-locking'

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

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
				if (filters?.property_id)
					params.append('property_id', filters.property_id)
				if (filters?.priority) params.append('priority', filters.priority)
				if (filters?.category) params.append('category', filters.category)
				if (filters?.status) params.append('status', filters.status)
				if (filters?.limit) params.append('limit', filters.limit.toString())
				if (filters?.offset) params.append('offset', filters.offset.toString())
				const queryString = params.toString()
				return apiRequest<PaginatedResponse<MaintenanceRequest>>(
					`/api/v1/maintenance${queryString ? `?${queryString}` : ''}`
				)
			},
			...QUERY_CACHE_TIMES.LIST
		}),

	details: () => [...maintenanceQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...maintenanceQueries.details(), id],
			queryFn: () =>
				apiRequest<MaintenanceRequest>(`/api/v1/maintenance/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	stats: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'stats'],
			queryFn: () => apiRequest('/api/v1/maintenance/stats'),
			...QUERY_CACHE_TIMES.STATS
		}),

	urgent: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'urgent'],
			queryFn: () =>
				apiRequest<MaintenanceRequest[]>('/api/v1/maintenance/urgent'),
			staleTime: 30 * 1000,
			gcTime: 5 * 60 * 1000
		}),

	overdue: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'overdue'],
			queryFn: () =>
				apiRequest<MaintenanceRequest[]>('/api/v1/maintenance/overdue'),
			...QUERY_CACHE_TIMES.STATS
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
					completed: response.summary.completed
				}
			},
			...QUERY_CACHE_TIMES.LIST
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all maintenance requests
 * Includes prefetching for instant navigation
 */
export function useAllMaintenanceRequests(query?: {
	unit_id?: string
	property_id?: string
	priority?: string
	category?: string
	status?: string
	limit?: number
	offset?: number
}) {
	return useQuery({
		...maintenanceQueries.list(query),
		// Extract data array for backward compatibility with components
		select: response => response.data
	})
}

/**
 * Hook to fetch single maintenance request
 */
export function useMaintenanceRequest(id: string) {
	return useQuery(maintenanceQueries.detail(id))
}

/**
 * Hook to fetch maintenance statistics
 */
export function useMaintenanceStats() {
	return useQuery(maintenanceQueries.stats())
}

/**
 * Hook to fetch urgent maintenance requests
 */
export function useUrgentMaintenance() {
	return useQuery(maintenanceQueries.urgent())
}

/**
 * Hook to fetch overdue maintenance requests
 */
export function useOverdueMaintenance() {
	return useQuery(maintenanceQueries.overdue())
}

/**
 * Hook to fetch tenant portal maintenance data
 */
export function useTenantPortalMaintenance() {
	return useQuery(maintenanceQueries.tenantPortal())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new maintenance request
 */
export function useMaintenanceRequestCreate() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: MaintenanceRequestCreate) =>
			apiRequest<MaintenanceRequest>('/api/v1/maintenance', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onMutate: async newRequest => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: maintenanceQueries.lists() })
			const previous = queryClient.getQueryData<MaintenanceRequest[]>(
				maintenanceQueries.lists()
			)

			// Optimistic update
			const tempId = `temp-${Date.now()}`
			const optimistic: MaintenanceRequest = {
				id: tempId,
				title: newRequest.title || '',
				description: newRequest.description,
				priority: newRequest.priority || 'normal',
				status: 'open',
				unit_id: newRequest.unit_id || '',
				tenant_id: newRequest.tenant_id || '',
				owner_user_id: '',
				requested_by: null,
				actual_cost: null,
				assigned_to: null,
				completed_at: null,
				inspection_date: newRequest.scheduled_date || null,
				inspection_findings: null,
				inspector_id: null,
				scheduled_date: newRequest.scheduled_date || null,
				estimated_cost: newRequest.estimated_cost ?? null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceQueries.lists(),
				old => (old ? [optimistic, ...old] : [optimistic])
			)

			return previous ? { previous } : {}
		},
		onError: (_err, _variables, context) => {
			// Rollback on error
			if (context?.previous) {
				queryClient.setQueryData(maintenanceQueries.lists(), context.previous)
			}
			handleMutationError(_err, 'Create maintenance request')
		},
		onSuccess: data => {
			handleMutationSuccess('Create maintenance request')
			// Update cache with real data
			queryClient.setQueryData(
				maintenanceQueries.detail(data.id).queryKey,
				data
			)
		},
		onSettled: () => {
			// Refetch in background
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
		}
	})
}

/**
 * Hook to update maintenance request with optimistic update
 */
export function useMaintenanceRequestUpdate() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			data,
			version
		}: {
			id: string
			data: MaintenanceRequestUpdate
			version?: number
		}): Promise<MaintenanceRequest> => {
			return apiRequest<MaintenanceRequest>(`/api/v1/maintenance/${id}`, {
				method: 'PUT',
				// OPTIMISTIC LOCKING: Include version if provided
				body: JSON.stringify(
					version !== null && version !== undefined
						? withVersion(data, version)
						: data
				)
			})
		},
		onMutate: async ({ id, data }) => {
			await queryClient.cancelQueries({
				queryKey: maintenanceQueries.detail(id).queryKey
			})
			const previous = queryClient.getQueryData<MaintenanceRequest>(
				maintenanceQueries.detail(id).queryKey
			)

			// Optimistic update (use incrementVersion helper)
			queryClient.setQueryData<MaintenanceRequestWithVersion>(
				maintenanceQueries.detail(id).queryKey,
				old =>
					old
						? incrementVersion(
								old,
								data as Partial<MaintenanceRequestWithVersion>
							)
						: undefined
			)

			// Also update list cache
			queryClient.setQueryData<MaintenanceRequestWithVersion[]>(
				maintenanceQueries.lists(),
				old => {
					if (!old) return old
					return old.map(m =>
						m.id === id
							? incrementVersion(
									m,
									data as Partial<MaintenanceRequestWithVersion>
								)
							: m
					)
				}
			)

			return { previous }
		},
		onError: (_err, { id }, context) => {
			if (context?.previous) {
				queryClient.setQueryData(
					maintenanceQueries.detail(id).queryKey,
					context.previous
				)
			}

			// Handle 409 Conflict using helper
			if (isConflictError(_err)) {
				handleConflictError('maintenance request', id, queryClient, [
					maintenanceQueries.detail(id).queryKey,
					maintenanceQueries.lists()
				])
			} else {
				handleMutationError(_err, 'Update maintenance request')
			}
		},
		onSuccess: () => {
			handleMutationSuccess('Update maintenance request')
		}
	})
}

/**
 * Note: DELETE operations now use React 19 useOptimistic with Server Actions
 * See: apps/frontend/src/app/(protected)/maintenance/page.tsx
 */

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to prefetch maintenance request
 */
export function usePrefetchMaintenanceRequest() {
	const queryClient = useQueryClient()

	return {
		prefetchMaintenanceRequest: (id: string) => {
			return queryClient.prefetchQuery(maintenanceQueries.detail(id))
		}
	}
}

/**
 * Hook to complete a maintenance request
 * Matches backend endpoint: POST /maintenance/:id/complete
 */
export function useCompleteMaintenance() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			actualCost,
			notes
		}: {
			id: string
			actualCost?: number
			notes?: string
		}): Promise<MaintenanceRequest> => {
			return apiRequest<MaintenanceRequest>(
				`/api/v1/maintenance/${id}/complete`,
				{
					method: 'POST',
					body: JSON.stringify({ actualCost, notes })
				}
			)
		},
		onMutate: async ({ id }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: maintenanceQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: maintenanceQueries.lists() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<MaintenanceRequest>(
				maintenanceQueries.detail(id).queryKey
			)
			const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
				maintenanceQueries.lists()
			)

			// Optimistically update to completed status
			queryClient.setQueryData<MaintenanceRequestWithVersion>(
				maintenanceQueries.detail(id).queryKey,
				old =>
					old
						? incrementVersion(old, {
								status: 'completed' as const,
								completed_at: new Date().toISOString(),
								updated_at: new Date().toISOString()
							})
						: undefined
			)

			queryClient.setQueryData<MaintenanceRequestWithVersion[]>(
				maintenanceQueries.lists(),
				old =>
					old?.map(item =>
						item.id === id
							? incrementVersion(item, {
									status: 'completed' as const,
									completed_at: new Date().toISOString(),
									updated_at: new Date().toISOString()
								})
							: item
					)
			)

			return { previousDetail, previousList }
		},
		onError: (_err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					maintenanceQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousList) {
				queryClient.setQueryData(
					maintenanceQueries.lists(),
					context.previousList
				)
			}
			handleMutationError(_err, 'Complete maintenance request')
		},
		onSuccess: (data, { id }) => {
			// Update with real server data
			queryClient.setQueryData(maintenanceQueries.detail(id).queryKey, data)
			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceQueries.lists(),
				old => old?.map(item => (item.id === id ? data : item))
			)
			handleMutationSuccess(
				'Complete maintenance request',
				'Maintenance request marked as complete'
			)
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			queryClient.invalidateQueries({
				queryKey: maintenanceQueries.stats().queryKey
			})
		}
	})
}

/**
 * Hook to cancel a maintenance request
 * Matches backend endpoint: POST /maintenance/:id/cancel
 */
export function useCancelMaintenance() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			reason
		}: {
			id: string
			reason?: string
		}): Promise<MaintenanceRequest> => {
			return apiRequest<MaintenanceRequest>(
				`/api/v1/maintenance/${id}/cancel`,
				{
					method: 'POST',
					body: JSON.stringify({ reason })
				}
			)
		},
		onMutate: async ({ id }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: maintenanceQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: maintenanceQueries.lists() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<MaintenanceRequest>(
				maintenanceQueries.detail(id).queryKey
			)
			const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
				maintenanceQueries.lists()
			)

			// Optimistically update to cancelled status
			queryClient.setQueryData<MaintenanceRequestWithVersion>(
				maintenanceQueries.detail(id).queryKey,
				old =>
					old
						? incrementVersion(old, {
								status: 'cancelled' as const,
								updated_at: new Date().toISOString()
							})
						: undefined
			)

			queryClient.setQueryData<MaintenanceRequestWithVersion[]>(
				maintenanceQueries.lists(),
				old =>
					old?.map(item =>
						item.id === id
							? incrementVersion(item, {
									status: 'cancelled' as const,
									updated_at: new Date().toISOString()
								})
							: item
					)
			)

			return { previousDetail, previousList }
		},
		onError: (_err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					maintenanceQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousList) {
				queryClient.setQueryData(
					maintenanceQueries.lists(),
					context.previousList
				)
			}
			handleMutationError(_err, 'Cancel maintenance request')
		},
		onSuccess: (data, { id }) => {
			// Update with real server data
			queryClient.setQueryData(maintenanceQueries.detail(id).queryKey, data)
			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceQueries.lists(),
				old => old?.map(item => (item.id === id ? data : item))
			)
			handleMutationSuccess(
				'Cancel maintenance request',
				'Maintenance request cancelled'
			)
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			queryClient.invalidateQueries({
				queryKey: maintenanceQueries.stats().queryKey
			})
		}
	})
}

/**
 * Combined hook for all maintenance operations
 * Note: DELETE operations now use React 19 useOptimistic with Server Actions
 */
export function useMaintenanceOperations() {
	const createRequest = useMaintenanceRequestCreate()
	const updateRequest = useMaintenanceRequestUpdate()
	const completeRequest = useCompleteMaintenance()
	const cancelRequest = useCancelMaintenance()

	return useMemo(
		() => ({
			createRequest,
			updateRequest,
			completeRequest,
			cancelRequest,
			isLoading:
				createRequest.isPending ||
				updateRequest.isPending ||
				completeRequest.isPending ||
				cancelRequest.isPending,
			error:
				createRequest.error ||
				updateRequest.error ||
				completeRequest.error ||
				cancelRequest.error
		}),
		[createRequest, updateRequest, completeRequest, cancelRequest]
	)
}
