/**
 * Emergency Contact Hooks & Query Options
 * TanStack Query hooks for managing tenant emergency contacts with colocated query options
 *
 * React 19 + TanStack Query v5 patterns
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
 * Emergency contact entity
 */
export interface EmergencyContact {
	id: string
	tenant_id: string
	contactName: string
	relationship: string
	phoneNumber: string
	email: string | null
	created_at: string
	updated_at: string
}

export interface CreateEmergencyContactInput {
	tenant_id: string
	contactName: string
	relationship: string
	phoneNumber: string
	email?: string | null
}

export interface UpdateEmergencyContactInput {
	contactName?: string
	relationship?: string
	phoneNumber?: string
	email?: string | null
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Emergency contact query keys for cache management
 */
export const emergencyContactKeys = {
	all: ['emergency-contacts'] as const,
	tenant: (tenant_id: string) =>
		[...emergencyContactKeys.all, tenant_id] as const
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
	 * Emergency contact for a tenant
	 */
	contact: (tenant_id: string) =>
		queryOptions({
			queryKey: [...emergencyContactQueries.all(), tenant_id],
			queryFn: () =>
				apiRequest<EmergencyContact | null>(
					`/api/v1/tenants/${tenant_id}/emergency-contact`
				),
			enabled: !!tenant_id,
			...QUERY_CACHE_TIMES.DETAIL
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch emergency contact for a tenant
 * Returns null if no emergency contact exists
 */
export function useEmergencyContact(tenant_id: string) {
	return useQuery(emergencyContactQueries.contact(tenant_id))
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create emergency contact for a tenant
 */
export function useCreateEmergencyContact(tenant_id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.emergencyContact.create,
		mutationFn: (input: Omit<CreateEmergencyContactInput, 'tenant_id'>) =>
			apiRequest<EmergencyContact>(
				`/api/v1/tenants/${tenant_id}/emergency-contact`,
				{
					method: 'POST',
					body: JSON.stringify({ ...input, tenant_id })
				}
			),

		onMutate: async newContact => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: emergencyContactKeys.tenant(tenant_id)
			})

			// Snapshot previous value
			const previousContact = queryClient.getQueryData<EmergencyContact | null>(
				emergencyContactKeys.tenant(tenant_id)
			)

			// Optimistically update with temporary ID
			queryClient.setQueryData(emergencyContactKeys.tenant(tenant_id), {
				id: 'temp-id',
				tenant_id,
				...newContact,
				email: newContact.email || null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})

			return { previousContact }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousContact !== undefined) {
				queryClient.setQueryData(
					emergencyContactKeys.tenant(tenant_id),
					context.previousContact
				)
			}

			logger.error('Failed to create emergency contact', {
				action: 'create_emergency_contact',
				metadata: { error: err }
			})
			handleMutationError(err, 'Create emergency contact')
		},

		onSuccess: () => {
			toast.success('Emergency contact saved successfully')
		},

		onSettled: () => {
			// Refetch to get real server data
			queryClient.invalidateQueries({
				queryKey: emergencyContactKeys.tenant(tenant_id)
			})
		}
	})
}

/**
 * Update emergency contact for a tenant
 */
export function useUpdateEmergencyContact(tenant_id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.emergencyContact.update,
		mutationFn: (input: UpdateEmergencyContactInput) =>
			apiRequest<EmergencyContact>(
				`/api/v1/tenants/${tenant_id}/emergency-contact`,
				{
					method: 'PUT',
					body: JSON.stringify(input)
				}
			),

		onMutate: async newData => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: emergencyContactKeys.tenant(tenant_id)
			})

			// Snapshot previous value
			const previousContact = queryClient.getQueryData<EmergencyContact | null>(
				emergencyContactKeys.tenant(tenant_id)
			)

			// Optimistically update (merge with existing data)
			if (previousContact) {
				queryClient.setQueryData(emergencyContactKeys.tenant(tenant_id), {
					...previousContact,
					...newData,
					updated_at: new Date().toISOString()
				})
			}

			return { previousContact }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousContact !== undefined) {
				queryClient.setQueryData(
					emergencyContactKeys.tenant(tenant_id),
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
			toast.success('Emergency contact updated successfully')
		},

		onSettled: () => {
			// Refetch to get real server data
			queryClient.invalidateQueries({
				queryKey: emergencyContactKeys.tenant(tenant_id)
			})
		}
	})
}

/**
 * Delete emergency contact for a tenant
 */
export function useDeleteEmergencyContact(tenant_id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.emergencyContact.delete,
		mutationFn: () =>
			apiRequest<{ success: boolean; message: string }>(
				`/api/v1/tenants/${tenant_id}/emergency-contact`,
				{
					method: 'DELETE'
				}
			),

		onMutate: async () => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: emergencyContactKeys.tenant(tenant_id)
			})

			// Snapshot previous value
			const previousContact = queryClient.getQueryData<EmergencyContact | null>(
				emergencyContactKeys.tenant(tenant_id)
			)

			// Optimistically set to null
			queryClient.setQueryData(emergencyContactKeys.tenant(tenant_id), null)

			return { previousContact }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousContact !== undefined) {
				queryClient.setQueryData(
					emergencyContactKeys.tenant(tenant_id),
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
				queryKey: emergencyContactKeys.tenant(tenant_id)
			})
		}
	})
}

