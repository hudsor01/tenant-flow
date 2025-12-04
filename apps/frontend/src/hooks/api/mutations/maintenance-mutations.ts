/**
 * Maintenance Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and optimistic updates.
 * Uses native fetch for NestJS calls.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import type { CreateMaintenanceRequestInput } from '@repo/shared/types/api-contracts'
import type { MaintenanceRequest } from '@repo/shared/types/core'

type UpdateMaintenanceRequest = Partial<CreateMaintenanceRequestInput>
import { maintenanceQueries } from '../queries/maintenance-queries'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'


/**
 * Create maintenance request mutation
 */
export function useCreateMaintenanceRequestMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateMaintenanceRequestInput) =>
			apiRequest<MaintenanceRequest>('/api/v1/maintenance', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: (_newRequest) => {
			// Invalidate and refetch maintenance lists
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			toast.success('Maintenance request created successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Create maintenance request')
		}
	})
}

/**
 * Update maintenance request mutation
 */
export function useUpdateMaintenanceRequestMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateMaintenanceRequest }) =>
			apiRequest<MaintenanceRequest>(`/api/v1/maintenance/${id}`, {
				method: 'PUT',
				body: JSON.stringify(data)
			}),
		onSuccess: (updatedRequest) => {
			// Update the specific maintenance request in cache
			queryClient.setQueryData(
				maintenanceQueries.detail(updatedRequest.id).queryKey,
				updatedRequest
			)
			// Invalidate lists to ensure consistency
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			toast.success('Maintenance request updated successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Update maintenance request')
		}
	})
}
