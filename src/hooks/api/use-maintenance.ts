/**
 * Maintenance Request Hooks
 * TanStack Query hooks for maintenance data fetching and mutations
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Query keys are in a separate file to avoid circular dependencies.
 *
 * mutationFn logic lives in maintenanceMutations factories (query-keys/maintenance-mutation-options.ts).
 * This file spreads factories and adds onSuccess/onError/onSettled callbacks.
 */

import {
	useMutation,
	useQueryClient
} from '@tanstack/react-query'

// Import query keys from separate file to avoid circular dependency
import { maintenanceQueries } from './query-keys/maintenance-keys'
import { maintenanceMutations } from './query-keys/maintenance-mutation-options'
import { handleMutationError } from '#lib/mutation-error-handler'
import { ownerDashboardKeys } from './use-owner-dashboard'
import { toast } from 'sonner'

/** Variables for update mutation including optional optimistic locking version */
export type { MaintenanceUpdateMutationVariables } from './query-keys/maintenance-mutation-options'

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create maintenance request mutation
 */
export function useMaintenanceRequestCreateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...maintenanceMutations.create(),
		onSuccess: _newRequest => {
			// Invalidate and refetch maintenance lists
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Maintenance request created successfully')
		},
		onError: error => {
			handleMutationError(error, 'Create maintenance request')
		}
	})
}

/**
 * Delete maintenance request mutation
 * Hard delete — maintenance requests are not financial records requiring 7-year retention
 */
export function useDeleteMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		...maintenanceMutations.delete(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
		},
		onError: error => {
			handleMutationError(error, 'Delete maintenance request')
		}
	})
}

/**
 * Update maintenance request mutation
 */
export function useMaintenanceRequestUpdateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...maintenanceMutations.update(),
		onSuccess: updatedRequest => {
			// Update the specific maintenance request in cache
			queryClient.setQueryData(
				maintenanceQueries.detail(updatedRequest.id).queryKey,
				updatedRequest
			)
			// Invalidate lists to ensure consistency
			queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Maintenance request updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update maintenance request')
		}
	})
}
