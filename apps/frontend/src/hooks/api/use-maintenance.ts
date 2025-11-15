/**
 * Maintenance Request Hooks
 * TanStack Query hooks for maintenance management with optimistic updates
 * Follows CUSTOM HOOKS architecture patterns
 */

import { clientFetch } from '#lib/api/client'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared/types/api-contracts'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceQueries } from './queries/maintenance-queries'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
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

/**
 * @deprecated Use maintenanceQueries from './queries/maintenance-queries' instead
 * Keeping for backward compatibility during migration
 */
export const maintenanceKeys = {
	all: maintenanceQueries.all(),
	list: () => maintenanceQueries.lists(),
	detail: (id: string) => maintenanceQueries.detail(id).queryKey,
	stats: () => maintenanceQueries.stats().queryKey,
	urgent: () => maintenanceQueries.urgent().queryKey,
	overdue: () => maintenanceQueries.overdue().queryKey
}

/**
 * Hook to fetch all maintenance requests
 * Includes prefetching for instant navigation
 */
export function useAllMaintenanceRequests(query?: {
	unitId?: string
	propertyId?: string
	priority?: string
	category?: string
	status?: string
	limit?: number
	offset?: number
}) {
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: [...maintenanceKeys.list(), query],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (query?.unitId) params.append('unitId', query.unitId)
			if (query?.propertyId) params.append('propertyId', query.propertyId)
			if (query?.priority) params.append('priority', query.priority)
			if (query?.category) params.append('category', query.category)
			if (query?.status) params.append('status', query.status)
			if (query?.limit) params.append('limit', query.limit.toString())
			if (query?.offset) params.append('offset', query.offset.toString())

			const response = await clientFetch<MaintenanceRequest[]>(
				`/api/v1/maintenance${params.toString() ? `?${params.toString()}` : ''}`
			)

			// Prefetch individual details for instant navigation
			response?.forEach?.(maintenance => {
				queryClient.setQueryData(
					maintenanceKeys.detail(maintenance.id),
					maintenance
				)
			})

			return response || []
		},
		...QUERY_CACHE_TIMES.DETAIL,
		gcTime: 10 * 60 * 1000, // 10 minutes cache
		retry: 2,
		structuralSharing: true
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
 * Hook to create maintenance request with optimistic update
 */
export function useCreateMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateMaintenanceRequest) =>
			clientFetch<MaintenanceRequest>('/api/v1/maintenance', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onMutate: async newRequest => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: maintenanceKeys.list() })
			const previous = queryClient.getQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list()
			)

			// Optimistic update
			const tempId = `temp-${Date.now()}`
			const optimistic: MaintenanceRequest = {
				id: tempId,
				title: newRequest.title,
				description: newRequest.description,
				priority:
					(newRequest.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') ||
					'MEDIUM',
				category: newRequest.category || null,
				status: 'OPEN',
				unitId: newRequest.unitId || '',
				requestedBy: null,
				assignedTo: null,
				estimatedCost: newRequest.estimatedCost || null,
				actualCost: null,
				completedAt: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				allowEntry: true,
				contactPhone: null,
				notes: null,
				photos: [],
				preferredDate: null,
				version: 1 //Optimistic locking
			}

			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list(),
				old => (old ? [optimistic, ...old] : [optimistic])
			)

			return previous ? { previous } : {}
		},
		onError: (_err, _variables, context) => {
			// Rollback on error
			if (context?.previous) {
				queryClient.setQueryData(maintenanceKeys.list(), context.previous)
			}
			handleMutationError(_err, 'Create maintenance request')
		},
		onSuccess: data => {
			handleMutationSuccess('Create maintenance request')
			// Update cache with real data
			queryClient.setQueryData(maintenanceKeys.detail(data.id), data)
		},
		onSettled: () => {
			// Refetch in background
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.list() })
		}
	})
}

/**
 * Hook to update maintenance request with optimistic update
 */
export function useUpdateMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			data,
			version
		}: {
			id: string
			data: UpdateMaintenanceRequest
			version?: number
		}): Promise<MaintenanceRequest> => {
			return clientFetch<MaintenanceRequest>(`/api/v1/maintenance/${id}`, {
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
			await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) })
			const previous = queryClient.getQueryData<MaintenanceRequest>(
				maintenanceKeys.detail(id)
			)

			// Optimistic update (use incrementVersion helper)
			queryClient.setQueryData<MaintenanceRequest>(
				maintenanceKeys.detail(id),
				old =>
					old
						? incrementVersion(old, data as Partial<MaintenanceRequest>)
						: undefined
			)

			// Also update list cache
			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list(),
				old => {
					if (!old) return old
					return old.map(m =>
						m.id === id
							? incrementVersion(m, data as Partial<MaintenanceRequest>)
							: m
					)
				}
			)

			return { previous }
		},
		onError: (_err, { id }, context) => {
			if (context?.previous) {
				queryClient.setQueryData(maintenanceKeys.detail(id), context.previous)
			}

			// Handle 409 Conflict using helper
			if (isConflictError(_err)) {
				handleConflictError('maintenance request', id, queryClient, [
					maintenanceKeys.detail(id),
					maintenanceKeys.list()
				])
			} else {
				handleMutationError(_err, 'Update maintenance request')
			}
		},
		onSuccess: () => {
			handleMutationSuccess('Update maintenance request')
		},
		onSettled: () => {
			// Refetch to ensure consistency (status changes affect stats)
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.list() })
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
		}
	})
}

/**
 * Note: DELETE operations now use React 19 useOptimistic with Server Actions
 * See: apps/frontend/src/app/(protected)/manage/maintenance/page.tsx
 */

/**
 * Hook to prefetch maintenance request
 */
export function usePrefetchMaintenanceRequest() {
	const queryClient = useQueryClient()

	return {
		prefetchMaintenanceRequest: (id: string) => {
			return queryClient.prefetchQuery({
				queryKey: maintenanceKeys.detail(id),
				queryFn: async (): Promise<MaintenanceRequest> => {
					return clientFetch<MaintenanceRequest>(`/api/v1/maintenance/${id}`)
				},
				...QUERY_CACHE_TIMES.DETAIL
			})
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
			return clientFetch<MaintenanceRequest>(
				`/api/v1/maintenance/${id}/complete`,
				{
					method: 'POST',
					body: JSON.stringify({ actualCost, notes })
				}
			)
		},
		onMutate: async ({ id }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: maintenanceKeys.list() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<MaintenanceRequest>(
				maintenanceKeys.detail(id)
			)
			const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list()
			)

			// Optimistically update to COMPLETED status
			queryClient.setQueryData<MaintenanceRequest>(
				maintenanceKeys.detail(id),
				old =>
					old
						? {
								...old,
								status: 'COMPLETED' as const,
								completedAt: new Date().toISOString(),
								updatedAt: new Date().toISOString()
							}
						: undefined
			)

			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list(),
				old =>
					old?.map(item =>
						item.id === id
							? {
									...item,
									status: 'COMPLETED' as const,
									completedAt: new Date().toISOString(),
									updatedAt: new Date().toISOString()
								}
							: item
					)
			)

			return { previousDetail, previousList }
		},
		onError: (_err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					maintenanceKeys.detail(id),
					context.previousDetail
				)
			}
			if (context?.previousList) {
				queryClient.setQueryData(maintenanceKeys.list(), context.previousList)
			}
			handleMutationError(_err, 'Complete maintenance request')
		},
		onSuccess: (data, { id }) => {
			// Update with real server data
			queryClient.setQueryData(maintenanceKeys.detail(id), data)
			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list(),
				old => old?.map(item => (item.id === id ? data : item))
			)
			handleMutationSuccess(
				'Complete maintenance request',
				'Maintenance request marked as complete'
			)
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.list() })
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
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
			return clientFetch<MaintenanceRequest>(
				`/api/v1/maintenance/${id}/cancel`,
				{
					method: 'POST',
					body: JSON.stringify({ reason })
				}
			)
		},
		onMutate: async ({ id }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: maintenanceKeys.list() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<MaintenanceRequest>(
				maintenanceKeys.detail(id)
			)
			const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list()
			)

			// Optimistically update to CANCELED status
			queryClient.setQueryData<MaintenanceRequest>(
				maintenanceKeys.detail(id),
				old =>
					old
						? {
								...old,
								status: 'CANCELED' as const,
								updatedAt: new Date().toISOString()
							}
						: undefined
			)

			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list(),
				old =>
					old?.map(item =>
						item.id === id
							? {
									...item,
									status: 'CANCELED' as const,
									updatedAt: new Date().toISOString()
								}
							: item
					)
			)

			return { previousDetail, previousList }
		},
		onError: (_err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					maintenanceKeys.detail(id),
					context.previousDetail
				)
			}
			if (context?.previousList) {
				queryClient.setQueryData(maintenanceKeys.list(), context.previousList)
			}
			handleMutationError(_err, 'Cancel maintenance request')
		},
		onSuccess: (data, { id }) => {
			// Update with real server data
			queryClient.setQueryData(maintenanceKeys.detail(id), data)
			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list(),
				old => old?.map(item => (item.id === id ? data : item))
			)
			handleMutationSuccess(
				'Cancel maintenance request',
				'Maintenance request cancelled'
			)
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.list() })
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
		}
	})
}

/**
 * Combined hook for all maintenance operations
 * Note: DELETE operations now use React 19 useOptimistic with Server Actions
 */
export function useMaintenanceOperations() {
	const createRequest = useCreateMaintenanceRequest()
	const updateRequest = useUpdateMaintenanceRequest()
	const completeRequest = useCompleteMaintenance()
	const cancelRequest = useCancelMaintenance()

	return {
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
	}
}
