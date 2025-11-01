/**
 * Maintenance Request Hooks
 * TanStack Query hooks for maintenance management with optimistic updates
 * Follows CUSTOM HOOKS architecture patterns
 */

import { API_BASE_URL } from '#lib/api-config'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared/types/backend-domain'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'

/**
 * Query keys for maintenance endpoints (hierarchical structure)
 */
export const maintenanceKeys = {
	all: ['maintenance'] as const,
	list: () => [...maintenanceKeys.all, 'list'] as const,
	detail: (id: string) => [...maintenanceKeys.all, 'detail', id] as const,
	stats: () => [...maintenanceKeys.all, 'stats'] as const,
	urgent: () => [...maintenanceKeys.all, 'urgent'] as const,
	overdue: () => [...maintenanceKeys.all, 'overdue'] as const
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

			const res = await fetch(
				`/api/v1/maintenance${params.toString() ? `?${params.toString()}` : ''}`,
				{
					credentials: 'include'
				}
			)

			if (!res.ok) {
				throw new Error('Failed to fetch maintenance requests')
			}

			const response = (await res.json()) as MaintenanceRequest[]

			// Prefetch individual details for instant navigation
			response?.forEach?.(maintenance => {
				queryClient.setQueryData(
					maintenanceKeys.detail(maintenance.id),
					maintenance
				)
			})

			return response || []
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes cache
		retry: 2,
		structuralSharing: true
	})
}

/**
 * Hook to fetch single maintenance request
 * Uses placeholder data from list cache
 */
export function useMaintenanceRequest(id: string) {
	return useQuery({
		queryKey: maintenanceKeys.detail(id),
		queryFn: async (): Promise<MaintenanceRequest> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/maintenance/${id}`, {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to fetch maintenance request')
			}

			return res.json()
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: 2
	})
}

/**
 * Hook to fetch maintenance statistics
 */
export function useMaintenanceStats() {
	return useQuery({
		queryKey: maintenanceKeys.stats(),
		queryFn: async (): Promise<{
			totalRequests: number
			pendingRequests: number
			inProgressRequests: number
			completedRequests: number
			urgentRequests: number
		}> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/maintenance/stats`, {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to fetch maintenance stats')
			}

			return res.json()
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}

/**
 * Hook to create maintenance request with optimistic update
 */
export function useCreateMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (
			data: CreateMaintenanceRequest
		): Promise<MaintenanceRequest> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/maintenance`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(data)
			})

			if (!res.ok) {
				throw new Error('Failed to create maintenance request')
			}

			return res.json()
		},
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
				version: 1 // 🔐 BUG FIX #2: Optimistic locking
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
			data
		}: {
			id: string
			data: UpdateMaintenanceRequest
		}): Promise<MaintenanceRequest> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/maintenance/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(data)
			})

			if (!res.ok) {
				throw new Error('Failed to update maintenance request')
			}

			return res.json()
		},
		onMutate: async ({ id, data }) => {
			await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) })
			const previous = queryClient.getQueryData<MaintenanceRequest>(
				maintenanceKeys.detail(id)
			)

			// Optimistic update
			queryClient.setQueryData<MaintenanceRequest>(
				maintenanceKeys.detail(id),
				old => {
					if (!old) return undefined
					return {
						...old,
						...data,
						updatedAt: new Date().toISOString()
					} as MaintenanceRequest
				}
			)

			// Also update list cache
			queryClient.setQueryData<MaintenanceRequest[]>(
				maintenanceKeys.list(),
				old => {
					if (!old) return old
					return old.map(m => {
						if (m.id !== id) return m
						return {
							...m,
							...data,
							updatedAt: new Date().toISOString()
						} as MaintenanceRequest
					})
				}
			)

			return { previous }
		},
		onError: (_err, { id }, context) => {
			if (context?.previous) {
				queryClient.setQueryData(maintenanceKeys.detail(id), context.previous)
			}
			handleMutationError(_err, 'Update maintenance request')
		},
		onSuccess: () => {
			handleMutationSuccess('Update maintenance request')
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
					const res = await fetch(`${API_BASE_URL}/api/v1/maintenance/${id}`, {
						credentials: 'include'
					})

					if (!res.ok) {
						throw new Error('Failed to fetch maintenance request')
					}

					return res.json()
				},
				staleTime: 5 * 60 * 1000
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
			const res = await fetch(`${API_BASE_URL}/api/v1/maintenance/${id}/complete`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ actualCost, notes })
			})

			if (!res.ok) {
				throw new Error('Failed to complete maintenance request')
			}

			return res.json()
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
			const res = await fetch(`${API_BASE_URL}/api/v1/maintenance/${id}/cancel`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ reason })
			})

			if (!res.ok) {
				throw new Error('Failed to cancel maintenance request')
			}

			return res.json()
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
