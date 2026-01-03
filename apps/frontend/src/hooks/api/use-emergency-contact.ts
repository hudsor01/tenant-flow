/**
 * Emergency Contact Hooks & Query Options
 * TanStack Query hooks for managing tenant emergency contacts with colocated query options
 *
 * React 19 + TanStack Query v5 patterns
 * Uses authenticated context - no tenant ID needed in URL
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { toast } from 'sonner'
import { logger } from '@repo/shared/lib/frontend-logger'
import { handleMutationError } from '#lib/mutation-error-handler'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Emergency contact entity (simplified structure from tenant table columns)
 */
export interface EmergencyContact {
	name: string | null
	phone: string | null
	relationship: string | null
}

export interface CreateEmergencyContactInput {
	name: string
	phone: string
	relationship?: string | null
}

export interface UpdateEmergencyContactInput {
	name?: string | null
	phone?: string | null
	relationship?: string | null
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Emergency contact query keys for cache management
 */
export const emergencyContactKeys = {
	all: ['emergency-contacts'] as const,
	detail: () => [...emergencyContactKeys.all, 'detail'] as const
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Emergency contact query factory
 */
export const emergencyContactQueries = {
	/**
	 * Base key for all emergency contact queries
	 */
	all: () => ['emergency-contacts'] as const,

	/**
	 * Emergency contact for authenticated tenant
	 * Uses authenticated context - no tenant ID needed
	 */
	contact: () =>
		queryOptions({
			queryKey: emergencyContactKeys.detail(),
			queryFn: () =>
				apiRequest<EmergencyContact | null>(
					'/api/v1/tenant-portal/settings/emergency-contact'
				),
			...QUERY_CACHE_TIMES.DETAIL
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch emergency contact for authenticated tenant
 * Returns null if no emergency contact exists
 * Uses authenticated context - no tenant ID needed
 */
export function useEmergencyContact() {
	return useQuery(emergencyContactQueries.contact())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create/Update emergency contact for authenticated tenant
 * Uses PUT to upsert (create or update)
 */
export function useUpdateEmergencyContact() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.emergencyContact.update,
		mutationFn: (input: UpdateEmergencyContactInput) =>
			apiRequest<EmergencyContact>(
				'/api/v1/tenant-portal/settings/emergency-contact',
				{
					method: 'PUT',
					body: JSON.stringify(input)
				}
			),

		onMutate: async newData => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: emergencyContactKeys.detail()
			})

			// Snapshot previous value
			const previousContact = queryClient.getQueryData<EmergencyContact | null>(
				emergencyContactKeys.detail()
			)

			// Optimistically update (merge with existing data)
			queryClient.setQueryData(emergencyContactKeys.detail(), {
				...previousContact,
				...newData
			})

			return { previousContact }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousContact !== undefined) {
				queryClient.setQueryData(
					emergencyContactKeys.detail(),
					context.previousContact
				)
			}

			logger.error('Failed to update emergency contact', {
				action: 'update_emergency_contact',
				metadata: { error: err }
			})
			handleMutationError(err, 'Update emergency contact')
		},

		onSuccess: () => {
			toast.success('Emergency contact saved successfully')
		},

		onSettled: () => {
			// Refetch to get real server data
			queryClient.invalidateQueries({
				queryKey: emergencyContactKeys.detail()
			})
		}
	})
}

/**
 * Delete emergency contact for authenticated tenant
 */
export function useDeleteEmergencyContact() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.emergencyContact.delete,
		mutationFn: () =>
			apiRequest<{ success: boolean }>('/api/v1/tenant-portal/settings/emergency-contact', {
				method: 'DELETE'
			}),

		onMutate: async () => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: emergencyContactKeys.detail()
			})

			// Snapshot previous value
			const previousContact = queryClient.getQueryData<EmergencyContact | null>(
				emergencyContactKeys.detail()
			)

			// Optimistically set to null
			queryClient.setQueryData(emergencyContactKeys.detail(), null)

			return { previousContact }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousContact !== undefined) {
				queryClient.setQueryData(
					emergencyContactKeys.detail(),
					context.previousContact
				)
			}

			logger.error('Failed to delete emergency contact', {
				action: 'delete_emergency_contact',
				metadata: { error: err }
			})
			handleMutationError(err, 'Delete emergency contact')
		},

		onSuccess: () => {
			toast.success('Emergency contact removed successfully')
		},

		onSettled: () => {
			// Refetch to confirm deletion
			queryClient.invalidateQueries({
				queryKey: emergencyContactKeys.detail()
			})
		}
	})
}
