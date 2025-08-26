<<<<<<< HEAD
/**
 * React Query hooks for Maintenance Requests
 * Direct API integration with backend endpoints
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
	MaintenanceRequest,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
	MaintenanceStatus
	// MaintenanceStats removed - unused in this hook
} from '@repo/shared'
import { maintenanceApi } from '@/lib/api/maintenance'
import { queryKeys } from '@/lib/react-query/query-keys'

/**
 * Hook to fetch maintenance requests with filters
 */
export function useMaintenanceRequests(
	params?: {
		status?: MaintenanceStatus
		priority?: string
		propertyId?: string
		unitId?: string
	},
	options: { enabled?: boolean } = {}
) {
	return useQuery({
		queryKey: queryKeys.maintenance.list(params),
		queryFn: async () => maintenanceApi.getAll(params),
		enabled: options.enabled ?? true,
		staleTime: 5 * 60 * 1000 // 5 minutes
=======
import { apiClient } from '@/lib/api-client'
/**
 * React Query hooks for Maintenance Requests
 * Native TanStack Query implementation - no custom abstractions
 */
import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
	maintenanceApi,
	maintenanceKeys,
	type MaintenanceStats
} from '@/lib/api/maintenance'
import type {
	MaintenanceRequest,
	MaintenanceQuery,
	CreateMaintenanceInput,
	UpdateMaintenanceInput
} from '@repo/shared'

/**
 * Fetch list of maintenance requests with optional filters
 */
export function useMaintenanceRequests(
	query?: MaintenanceQuery,
	options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest[], Error> {
	return useQuery({
		queryKey: maintenanceKeys.list(query),
		queryFn: () => maintenanceApi.getAll(query),
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
>>>>>>> origin/main
	})
}

/**
<<<<<<< HEAD
 * Hook to fetch maintenance statistics
 */
export function useMaintenanceStats() {
	return useQuery({
		queryKey: queryKeys.maintenance.stats(),
		queryFn: async () => maintenanceApi.getStats(),
		staleTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Hook to fetch single maintenance request
=======
 * Fetch single maintenance request by ID
>>>>>>> origin/main
 */
export function useMaintenanceRequest(
	id: string,
	options?: { enabled?: boolean }
<<<<<<< HEAD
) {
	return useQuery({
		queryKey: queryKeys.maintenance.detail(id),
		queryFn: async () => maintenanceApi.getById(id),
=======
): UseQueryResult<MaintenanceRequest, Error> {
	return useQuery({
		queryKey: maintenanceKeys.detail(id),
		queryFn: () => maintenanceApi.getById(id),
>>>>>>> origin/main
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
<<<<<<< HEAD
 * Hook to create maintenance requests
 */
export function useCreateMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (input: CreateMaintenanceInput) =>
			maintenanceApi.create(input),
		onMutate: async newRequest => {
			await queryClient.cancelQueries({
				queryKey: queryKeys.maintenance.lists()
			})
			const previousRequests = queryClient.getQueryData(
				queryKeys.maintenance.lists()
			)

			queryClient.setQueriesData(
				{ queryKey: queryKeys.maintenance.lists() },
				(old: MaintenanceRequest[] | undefined) => {
					if (!old) {
						return []
					}
=======
 * Fetch maintenance requests by property ID
 */
export function useMaintenanceByProperty(
	propertyId: string,
	options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest[], Error> {
	return useQuery({
		queryKey: maintenanceKeys.byProperty(propertyId),
		queryFn: () => maintenanceApi.getByProperty(propertyId),
		enabled: Boolean(propertyId) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch maintenance requests by tenant ID
 */
export function useMaintenanceByTenant(
	tenantId: string,
	options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest[], Error> {
	return useQuery({
		queryKey: maintenanceKeys.byTenant(tenantId),
		queryFn: () => maintenanceApi.getByTenant(tenantId),
		enabled: Boolean(tenantId) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch maintenance statistics
 */
export function useMaintenanceStats(): UseQueryResult<MaintenanceStats, Error> {
	return useQuery({
		queryKey: maintenanceKeys.stats(),
		queryFn: maintenanceApi.getStats,
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

/**
 * Create new maintenance request with optimistic updates
 */
export function useCreateMaintenanceRequest(): UseMutationResult<
	MaintenanceRequest,
	Error,
	CreateMaintenanceInput
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: maintenanceApi.create,
		onMutate: async newRequest => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: maintenanceKeys.lists()
			})

			// Snapshot the previous value
			const previousRequests = queryClient.getQueryData(
				maintenanceKeys.lists()
			)

			// Optimistically update all maintenance lists
			queryClient.setQueriesData(
				{ queryKey: maintenanceKeys.lists() },
				(old: MaintenanceRequest[] | undefined) => {
					if (!old) return []
>>>>>>> origin/main
					return [
						...old,
						{
							...newRequest,
							id: `temp-${Date.now()}`,
<<<<<<< HEAD
							status: 'OPEN',
							assignedTo: null,
							estimatedCost: null,
							actualCost: null,
							completedAt: null,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString()
=======
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
							assignedTo: null,
							estimatedCost: null,
							actualCost: null,
							completedAt: null
>>>>>>> origin/main
						} as MaintenanceRequest
					]
				}
			)

			return { previousRequests }
		},
		onError: (err, newRequest, context) => {
<<<<<<< HEAD
			if (context?.previousRequests) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.maintenance.lists() },
=======
			// Revert optimistic update on error
			if (context?.previousRequests) {
				queryClient.setQueriesData(
					{ queryKey: maintenanceKeys.lists() },
>>>>>>> origin/main
					context.previousRequests
				)
			}
			toast.error('Failed to create maintenance request')
		},
		onSuccess: () => {
			toast.success('Maintenance request created successfully')
		},
		onSettled: () => {
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.stats()
			})
=======
			// Always refetch after error or success
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
>>>>>>> origin/main
		}
	})
}

/**
<<<<<<< HEAD
 * Hook to update maintenance requests
 */
export function useUpdateMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			input
		}: {
			id: string
			input: UpdateMaintenanceInput
		}) => maintenanceApi.update(id, input),
		onMutate: async ({ id, input }) => {
			await queryClient.cancelQueries({
				queryKey: queryKeys.maintenance.detail(id)
			})
			const previousRequest = queryClient.getQueryData(
				queryKeys.maintenance.detail(id)
			)

			queryClient.setQueryData(
				queryKeys.maintenance.detail(id),
				(old: MaintenanceRequest | undefined) => {
					if (!old) {
						return old
					}
					return { ...old, ...input, updatedAt: new Date() }
				}
			)

			return { previousRequest }
		},
		onError: (err, variables, context) => {
			if (context?.previousRequest) {
				queryClient.setQueryData(
					queryKeys.maintenance.detail(variables.id),
					context.previousRequest
				)
			}
=======
 * Update maintenance request with optimistic updates
 */
export function useUpdateMaintenanceRequest(): UseMutationResult<
	MaintenanceRequest,
	Error,
	{ id: string; data: UpdateMaintenanceInput }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }) => maintenanceApi.update(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this request
			await queryClient.cancelQueries({
				queryKey: maintenanceKeys.detail(id)
			})
			await queryClient.cancelQueries({
				queryKey: maintenanceKeys.lists()
			})

			// Snapshot the previous values
			const previousRequest = queryClient.getQueryData(
				maintenanceKeys.detail(id)
			)
			const previousList = queryClient.getQueryData(
				maintenanceKeys.lists()
			)

			// Optimistically update request detail
			queryClient.setQueryData(
				maintenanceKeys.detail(id),
				(old: MaintenanceRequest | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update request in lists
			queryClient.setQueriesData(
				{ queryKey: maintenanceKeys.lists() },
				(old: MaintenanceRequest[] | undefined) =>
					old?.map(request =>
						request.id === id
							? { ...request, ...data, updatedAt: new Date() }
							: request
					)
			)

			return { previousRequest, previousList }
		},
		onError: (err, { id }, context) => {
			// Revert optimistic updates on error
			if (context?.previousRequest) {
				queryClient.setQueryData(
					maintenanceKeys.detail(id),
					context.previousRequest
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: maintenanceKeys.lists() },
					context.previousList
				)
			}
>>>>>>> origin/main
			toast.error('Failed to update maintenance request')
		},
		onSuccess: () => {
			toast.success('Maintenance request updated successfully')
		},
<<<<<<< HEAD
		onSettled: (data, error, { id }) => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.stats()
			})
=======
		onSettled: (data, err, { id }) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({
				queryKey: maintenanceKeys.detail(id)
			})
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
>>>>>>> origin/main
		}
	})
}

/**
<<<<<<< HEAD
 * Hook to update maintenance request status
 */
export function useUpdateMaintenanceStatus() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			status
		}: {
			id: string
			status: MaintenanceStatus
		}) => maintenanceApi.updateStatus(id, status),
		onSuccess: () => {
			toast.success('Status updated successfully')
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.stats()
			})
		}
	})
}

/**
 * Hook to delete maintenance requests
 */
export function useDeleteMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => maintenanceApi.delete(id),
=======
 * Delete maintenance request with optimistic updates
 */
export function useDeleteMaintenanceRequest(): UseMutationResult<
	void,
	Error,
	string
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: maintenanceApi.delete,
		onMutate: async id => {
			// Cancel queries
			await queryClient.cancelQueries({
				queryKey: maintenanceKeys.lists()
			})

			// Snapshot previous list
			const previousList = queryClient.getQueryData(
				maintenanceKeys.lists()
			)

			// Optimistically remove request from lists
			queryClient.setQueriesData(
				{ queryKey: maintenanceKeys.lists() },
				(old: MaintenanceRequest[] | undefined) =>
					old?.filter(request => request.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: maintenanceKeys.lists() },
					context.previousList
				)
			}
			toast.error('Failed to delete maintenance request')
		},
>>>>>>> origin/main
		onSuccess: () => {
			toast.success('Maintenance request deleted successfully')
		},
		onSettled: () => {
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.maintenance.stats()
=======
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
		}
	})
}

/**
 * Update maintenance request status
 */
export function useUpdateMaintenanceStatus(): UseMutationResult<
	MaintenanceRequest,
	Error,
	{ id: string; status: string }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, status }) => maintenanceApi.updateStatus(id, status),
		onMutate: async ({ id, status }) => {
			// Cancel queries for this request
			await queryClient.cancelQueries({
				queryKey: maintenanceKeys.detail(id)
			})
			await queryClient.cancelQueries({
				queryKey: maintenanceKeys.lists()
			})

			// Snapshot the previous values
			const previousRequest = queryClient.getQueryData(
				maintenanceKeys.detail(id)
			)
			const previousList = queryClient.getQueryData(
				maintenanceKeys.lists()
			)

			// Optimistically update request detail
			queryClient.setQueryData(
				maintenanceKeys.detail(id),
				(old: MaintenanceRequest | undefined) =>
					old ? { ...old, status, updatedAt: new Date() } : undefined
			)

			// Optimistically update request in lists
			queryClient.setQueriesData(
				{ queryKey: maintenanceKeys.lists() },
				(old: MaintenanceRequest[] | undefined) =>
					old?.map(request =>
						request.id === id
							? { ...request, status, updatedAt: new Date() }
							: request
					)
			)

			return { previousRequest, previousList }
		},
		onError: (err, { id }, context) => {
			// Revert optimistic updates on error
			if (context?.previousRequest) {
				queryClient.setQueryData(
					maintenanceKeys.detail(id),
					context.previousRequest
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: maintenanceKeys.lists() },
					context.previousList
				)
			}
			toast.error('Failed to update status')
		},
		onSuccess: (data, { status }) => {
			const statusMessages: Record<string, string> = {
				OPEN: 'Request opened successfully',
				IN_PROGRESS: 'Request marked as in progress',
				COMPLETED: 'Request marked as completed',
				CANCELED: 'Request cancelled',
				ON_HOLD: 'Request put on hold'
			}

			toast.success(statusMessages[status] || 'Request status updated')
		},
		onSettled: (data, err, { id }) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({
				queryKey: maintenanceKeys.detail(id)
			})
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
		}
	})
}

/**
 * Assign vendor to maintenance request
 */
export function useAssignMaintenanceVendor(): UseMutationResult<
	MaintenanceRequest,
	Error,
	{ id: string; vendorId: string }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, vendorId }) =>
			maintenanceApi.assignVendor(id, vendorId),
		onSuccess: () => {
			toast.success('Vendor assigned successfully')
		},
		onError: () => {
			toast.error('Failed to assign vendor')
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
		}
	})
}

/**
 * Add comment to maintenance request
 */
export function useAddMaintenanceComment(): UseMutationResult<
	{ message: string },
	Error,
	{ id: string; comment: string }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, comment }) => maintenanceApi.addComment(id, comment),
		onSuccess: () => {
			toast.success('Comment added successfully')
		},
		onError: () => {
			toast.error('Failed to add comment')
		},
		onSettled: (data, err, { id }) => {
			queryClient.invalidateQueries({
				queryKey: maintenanceKeys.detail(id)
			})
		}
	})
}

/**
 * Upload image to maintenance request
 */
export function useUploadMaintenanceImage(): UseMutationResult<
	{ url: string },
	Error,
	{ id: string; formData: FormData }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, formData }) =>
			maintenanceApi.uploadImage(id, formData),
		onSuccess: () => {
			toast.success('Image uploaded successfully')
		},
		onError: () => {
			toast.error('Failed to upload image')
		},
		onSettled: (data, err, { id }) => {
			queryClient.invalidateQueries({
				queryKey: maintenanceKeys.detail(id)
>>>>>>> origin/main
			})
		}
	})
}
