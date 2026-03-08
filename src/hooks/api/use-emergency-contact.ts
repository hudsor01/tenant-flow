/**
 * Emergency Contact Hooks & Query Options
 * TanStack Query hooks for managing tenant emergency contacts with colocated query options
 *
 * React 19 + TanStack Query v5 patterns
 * Uses authenticated context - no tenant ID needed in URL
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { toast } from 'sonner'
import { logger } from '#lib/frontend-logger.js'
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
			queryFn: async (): Promise<EmergencyContact | null> => {
				const supabase = createClient()

				const user = await getCachedUser()

				if (!user) throw new Error('Not authenticated')

				const { data, error } = await supabase
					.from('tenants')
					.select(
						'emergency_contact_name, emergency_contact_phone, emergency_contact_relationship'
					)
					.eq('user_id', user.id)
					.maybeSingle()

				if (error) throw error

				if (data === null) return null

				// Return null if all three fields are null (no emergency contact set)
				if (
					data.emergency_contact_name === null &&
					data.emergency_contact_phone === null &&
					data.emergency_contact_relationship === null
				) {
					return null
				}

				return {
					name: data.emergency_contact_name,
					phone: data.emergency_contact_phone,
					relationship: data.emergency_contact_relationship
				}
			},
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
		mutationFn: async (input: UpdateEmergencyContactInput): Promise<EmergencyContact> => {
			const supabase = createClient()

			const user = await getCachedUser()

			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('tenants')
				.update({
					emergency_contact_name: input.name ?? null,
					emergency_contact_phone: input.phone ?? null,
					emergency_contact_relationship: input.relationship ?? null
				})
				.eq('user_id', user.id)
				.select(
					'emergency_contact_name, emergency_contact_phone, emergency_contact_relationship'
				)
				.single()

			if (error) throw error

			return {
				name: data.emergency_contact_name,
				phone: data.emergency_contact_phone,
				relationship: data.emergency_contact_relationship
			}
		},

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
		mutationFn: async (): Promise<{ success: boolean }> => {
			const supabase = createClient()

			const user = await getCachedUser()

			if (!user) throw new Error('Not authenticated')

			const { error } = await supabase
				.from('tenants')
				.update({
					emergency_contact_name: null,
					emergency_contact_phone: null,
					emergency_contact_relationship: null
				})
				.eq('user_id', user.id)

			if (error) throw error

			return { success: true }
		},

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
