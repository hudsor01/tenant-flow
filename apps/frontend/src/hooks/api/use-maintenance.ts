/**
 * Maintenance Request Hooks
 * TanStack Query hooks for maintenance data fetching and mutations
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Query keys are in a separate file to avoid circular dependencies.
 */

import {
	useMutation,
	usePrefetchQuery,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'

// Import query keys from separate file to avoid circular dependency
import { maintenanceQueries, type MaintenanceFilters } from './query-keys/maintenance-keys'
import { apiRequest } from '#lib/api-request'
import { useUser } from '#hooks/api/use-auth'
import { handleMutationError } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'
import { toast } from 'sonner'

/**
 * Extract data array from paginated response
 * Stable reference for TanStack Query select optimization
 */
const selectPaginatedData = <T>(response: PaginatedResponse<T>): T[] => response.data

/** Variables for update mutation including optional optimistic locking version */
export interface MaintenanceUpdateMutationVariables {
	id: string
	data: MaintenanceRequestUpdate
	version?: number
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all maintenance requests
 * Includes prefetching for instant navigation
 *
 * Optimizations from TanStack Query docs:
 * - notifyOnChangeProps: Only re-render when data/error/isPending change
 * - select: Using stable function reference (selectPaginatedData)
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations
 */
export function useAllMaintenanceRequests(query?: MaintenanceFilters) {
	return useQuery({
		...maintenanceQueries.list(query),
		// Stable select function - defined outside component for referential equality
		select: selectPaginatedData,
		structuralSharing: true,
		// Only re-render when these properties change
		notifyOnChangeProps: ['data', 'error', 'isPending', 'isFetching']
	})
}

/**
 * Hook to fetch single maintenance request
 * Uses placeholderData from list cache for instant detail view
 */
export function useMaintenanceRequest(id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		...maintenanceQueries.detail(id),
		placeholderData: () => {
			// Search all list caches for this maintenance request
			const listCaches = queryClient.getQueriesData<{
				data?: MaintenanceRequest[]
			}>({
				queryKey: maintenanceQueries.lists()
			})

			for (const [, response] of listCaches) {
				const item = response?.data?.find(m => m.id === id)
				if (item) return item
			}
			return undefined
		}
	})
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
// PREFETCH HOOKS
// ============================================================================

/**
 * Declarative prefetch hook for maintenance request detail
 * Prefetches when component mounts (route-level prefetching)
 *
 * For imperative prefetching (e.g., on hover), use:
 * queryClient.prefetchQuery(maintenanceQueries.detail(id))
 */
export function usePrefetchMaintenanceRequestDetail(id: string) {
	usePrefetchQuery(maintenanceQueries.detail(id))
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create maintenance request mutation
 */
export function useMaintenanceRequestCreateMutation() {
	const queryClient = useQueryClient()
	const { data: user } = useUser()

	return useMutation({
		mutationKey: mutationKeys.maintenance.create,
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
 */
export function useDeleteMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.maintenance.delete,
		mutationFn: (id: string) =>
			apiRequest<void>(`/api/v1/maintenance/${id}`, { method: 'DELETE' }),
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
		mutationKey: mutationKeys.maintenance.update,
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
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Maintenance request updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update maintenance request')
		}
	})
}
