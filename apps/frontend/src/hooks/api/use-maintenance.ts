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
import type { MaintenanceRequest, MaintenanceRequestWithVersion } from '@repo/shared/types/core'
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceQueries } from './queries/maintenance-queries'
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
	return useQuery(maintenanceQueries.list(query))
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
				priority:
					(newRequest.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') ||
					'MEDIUM',
				status: 'OPEN',
				unit_id: newRequest.unit_id,
				tenant_id: newRequest.tenant_id || '',
				property_owner_id: '',
				requested_by: null,
				actual_cost: null,
				assigned_to: null,
				completed_at: null,
				inspection_date: newRequest.scheduledDate || null,
				inspection_findings: null,
				inspector_id: null,
				scheduled_date: newRequest.scheduledDate || null,
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
			queryClient.setQueryData(maintenanceQueries.detail(data.id).queryKey, data)
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
				await queryClient.cancelQueries({ queryKey: maintenanceQueries.detail(id).queryKey })
				const previous = queryClient.getQueryData<MaintenanceRequest>(
					maintenanceQueries.detail(id).queryKey
				)

				// Optimistic update (use incrementVersion helper)
				queryClient.setQueryData<MaintenanceRequestWithVersion>(
					maintenanceQueries.detail(id).queryKey,
					(old) =>
						old
							? incrementVersion(old, data)
							: undefined
				)

				// Also update list cache
				queryClient.setQueryData<MaintenanceRequestWithVersion[]>(
					maintenanceQueries.lists(),
					(old) => {
						if (!old) return old
						return old.map(m =>
							m.id === id
								? incrementVersion(m, data)
								: m
						)
					}
				)

				return { previous }
			},
			onError: (_err, { id }, context) => {
				if (context?.previous) {
					queryClient.setQueryData(maintenanceQueries.detail(id).queryKey, context.previous)
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
				await queryClient.cancelQueries({ queryKey: maintenanceQueries.detail(id).queryKey })
				await queryClient.cancelQueries({ queryKey: maintenanceQueries.lists() })

				// Snapshot previous state
				const previousDetail = queryClient.getQueryData<MaintenanceRequest>(
					maintenanceQueries.detail(id).queryKey
				)
				const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
					maintenanceQueries.lists()
				)

				// Optimistically update to COMPLETED status
				queryClient.setQueryData<MaintenanceRequestWithVersion>(
					maintenanceQueries.detail(id).queryKey,
					(old) =>
						old
							? incrementVersion(old, {
								status: 'COMPLETED' as const,
								completed_at: new Date().toISOString(),
								updated_at: new Date().toISOString()
							})
							: undefined
				)

				queryClient.setQueryData<MaintenanceRequestWithVersion[]>(
					maintenanceQueries.lists(),
					(old) =>
						old?.map(item =>
							item.id === id
								? incrementVersion(item, {
									status: 'COMPLETED' as const,
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
					queryClient.setQueryData(maintenanceQueries.lists(), context.previousList)
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
				queryClient.invalidateQueries({ queryKey: maintenanceQueries.stats().queryKey })
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
				await queryClient.cancelQueries({ queryKey: maintenanceQueries.detail(id).queryKey })
				await queryClient.cancelQueries({ queryKey: maintenanceQueries.lists() })

				// Snapshot previous state
				const previousDetail = queryClient.getQueryData<MaintenanceRequest>(
					maintenanceQueries.detail(id).queryKey
				)
				const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
					maintenanceQueries.lists()
				)

				// Optimistically update to CANCELED status
				queryClient.setQueryData<MaintenanceRequestWithVersion>(
					maintenanceQueries.detail(id).queryKey,
					(old) =>
						old
							? incrementVersion(old, {
								status: 'CANCELED' as const,
								updated_at: new Date().toISOString()
							})
							: undefined
				)

				queryClient.setQueryData<MaintenanceRequestWithVersion[]>(
					maintenanceQueries.lists(),
					(old) =>
						old?.map(item =>
							item.id === id
								? incrementVersion(item, {
									status: 'CANCELED' as const,
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
					queryClient.setQueryData(maintenanceQueries.lists(), context.previousList)
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
				queryClient.invalidateQueries({ queryKey: maintenanceQueries.stats().queryKey })
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

	return useMemo(() => ({
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
	}), [createRequest, updateRequest, completeRequest, cancelRequest])
}
