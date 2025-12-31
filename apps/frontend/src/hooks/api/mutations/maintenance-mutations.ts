/**
 * Maintenance Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and optimistic updates.
 * Uses native fetch for NestJS calls.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { useUser } from '#hooks/api/use-auth'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'
import type { MaintenanceRequest } from '@repo/shared/types/core'

/** Variables for update mutation including optional optimistic locking version */
export interface MaintenanceUpdateMutationVariables {
	id: string
	data: MaintenanceRequestUpdate
	version?: number
}

import { maintenanceQueries } from '../queries/maintenance-queries'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

/**
 * Create maintenance request mutation
 */
export function useMaintenanceRequestCreateMutation() {
	const queryClient = useQueryClient()
	const { data: user } = useUser()

	return useMutation({
		mutationFn: (data: MaintenanceRequestCreate) =>
			apiRequest<MaintenanceRequest>('/api/v1/maintenance', {
				method: 'POST',
				body: JSON.stringify({
					...data,
					owner_user_id: user?.id
				})
			}),
		onSuccess: _newRequest => {
			// Invalidate and refetch maintenance lists
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			toast.success('Maintenance request created successfully')
		},
		onError: error => {
			handleMutationError(error, 'Create maintenance request')
		}
	})
}

/**
 * Update maintenance request mutation
 */
export function useMaintenanceRequestUpdateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data, version }: MaintenanceUpdateMutationVariables) =>
			apiRequest<MaintenanceRequest>(`/api/v1/maintenance/${id}`, {
				method: 'PUT',
				body: JSON.stringify(
					version !== undefined ? { ...data, version } : data
				)
			}),
		onSuccess: updatedRequest => {
			// Update the specific maintenance request in cache
			queryClient.setQueryData(
				maintenanceQueries.detail(updatedRequest.id).queryKey,
				updatedRequest
			)
			// Invalidate lists to ensure consistency
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			toast.success('Maintenance request updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update maintenance request')
		}
	})
}
