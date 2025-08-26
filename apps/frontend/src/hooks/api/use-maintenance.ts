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
	})
}

/**
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
 */
export function useMaintenanceRequest(
	id: string,
	options?: { enabled?: boolean }
) {
	return useQuery({
		queryKey: queryKeys.maintenance.detail(id),
		queryFn: async () => maintenanceApi.getById(id),
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
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
					return [
						...old,
						{
							...newRequest,
							id: `temp-${Date.now()}`,
							status: 'OPEN',
							assignedTo: null,
							estimatedCost: null,
							actualCost: null,
							completedAt: null,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString()
						} as MaintenanceRequest
					]
				}
			)

			return { previousRequests }
		},
		onError: (err, newRequest, context) => {
			if (context?.previousRequests) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.maintenance.lists() },
					context.previousRequests
				)
			}
			toast.error('Failed to create maintenance request')
		},
		onSuccess: () => {
			toast.success('Maintenance request created successfully')
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
			toast.error('Failed to update maintenance request')
		},
		onSuccess: () => {
			toast.success('Maintenance request updated successfully')
		},
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
		}
	})
}

/**
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
		onSuccess: () => {
			toast.success('Maintenance request deleted successfully')
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
