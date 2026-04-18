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
import type { MaintenanceRequest } from '#types/core'
import { maintenanceQueries, maintenanceMutations } from './query-keys/maintenance-keys'
import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'
import { ownerDashboardKeys } from './use-owner-dashboard'

/** Variables for update mutation including optional optimistic locking version */
export type { MaintenanceUpdateMutationVariables } from './query-keys/maintenance-keys'

/**
 * Create maintenance request mutation
 */
export function useMaintenanceRequestCreateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...maintenanceMutations.create(),
		...createMutationCallbacks(queryClient, {
			invalidate: [maintenanceQueries.lists(), ownerDashboardKeys.all],
			successMessage: 'Maintenance request created successfully',
			errorContext: 'Create maintenance request'
		})
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
		...createMutationCallbacks(queryClient, {
			invalidate: [maintenanceQueries.lists(), ownerDashboardKeys.all],
			errorContext: 'Delete maintenance request'
		})
	})
}

/**
 * Update maintenance request mutation
 */
export function useMaintenanceRequestUpdateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...maintenanceMutations.update(),
		...createMutationCallbacks<MaintenanceRequest>(queryClient, {
			invalidate: [maintenanceQueries.lists(), ownerDashboardKeys.all],
			updateDetail: request => ({
				queryKey: maintenanceQueries.detail(request.id).queryKey,
				data: request
			}),
			successMessage: 'Maintenance request updated successfully',
			errorContext: 'Update maintenance request'
		})
	})
}
