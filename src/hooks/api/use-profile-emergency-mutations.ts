/**
 * Profile Emergency Contact Mutation Hooks
 * TanStack Query mutation hooks for tenant emergency contact management.
 *
 * Split from use-profile-mutations.ts for the 300-line file size rule.
 */

import { useMutation, useQueryClient, mutationOptions } from '@tanstack/react-query'
import { logger } from '#lib/frontend-logger.js'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import type {
	SetEmergencyContactInput,
	UserProfile
} from '#types/api-contracts'

import { mutationKeys } from './mutation-keys'
import { profileKeys } from './use-profile'

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

const profileEmergencyMutationFactories = {
	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.profile.updateEmergencyContact,
			mutationFn: async (
				input: SetEmergencyContactInput
			): Promise<{ success: boolean; message: string }> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { error } = await supabase
					.from('tenants')
					.update({
						emergency_contact_name: input.name,
						emergency_contact_phone: input.phone,
						emergency_contact_relationship: input.relationship ?? null
					})
					.eq('user_id', user.id)
				if (error) throw error
				return { success: true, message: 'Emergency contact updated' }
			}
		}),

	remove: () =>
		mutationOptions<{ success: boolean; message: string }, unknown, void>({
			mutationKey: mutationKeys.profile.deleteEmergencyContact,
			mutationFn: async (): Promise<{ success: boolean; message: string }> => {
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
				return { success: true, message: 'Emergency contact removed' }
			}
		})
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Update emergency contact (for tenants)
 * Emergency contact data lives on the tenants table (not users table)
 */
export function useUpdateProfileEmergencyContactMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...profileEmergencyMutationFactories.update(),

		onMutate: async newData => {
			await queryClient.cancelQueries({ queryKey: profileKeys.detail() })

			const previousProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail()
			)

			if (previousProfile?.tenant_profile) {
				queryClient.setQueryData(profileKeys.detail(), {
					...previousProfile,
					tenant_profile: {
						...previousProfile.tenant_profile,
						emergency_contact_name: newData.name,
						emergency_contact_phone: newData.phone,
						emergency_contact_relationship: newData.relationship
					}
				})
			}

			return { previousProfile }
		},

		onError: (err, _variables, context) => {
			if (context?.previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), context.previousProfile)
			}

			logger.error('Failed to update emergency contact', {
				action: 'update_emergency_contact',
				metadata: { error: err }
			})
			handleMutationError(err, 'Update emergency contact')
		},

		onSuccess: () => {
			handleMutationSuccess(
				'Update emergency contact',
				'Your emergency contact has been updated'
			)
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.detail() })
		}
	})
}

/**
 * Remove emergency contact (for tenants)
 * Emergency contact data lives on the tenants table (not users table)
 */
export function useRemoveProfileEmergencyContactMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...profileEmergencyMutationFactories.remove(),

		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: profileKeys.detail() })

			const previousProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail()
			)

			if (previousProfile?.tenant_profile) {
				queryClient.setQueryData(profileKeys.detail(), {
					...previousProfile,
					tenant_profile: {
						...previousProfile.tenant_profile,
						emergency_contact_name: null,
						emergency_contact_phone: null,
						emergency_contact_relationship: null
					}
				})
			}

			return { previousProfile }
		},

		onError: (err, _variables, context) => {
			if (context?.previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), context.previousProfile)
			}

			logger.error('Failed to remove emergency contact', {
				action: 'remove_emergency_contact',
				metadata: { error: err }
			})
			handleMutationError(err, 'Remove emergency contact')
		},

		onSuccess: () => {
			handleMutationSuccess(
				'Remove emergency contact',
				'Your emergency contact has been removed'
			)
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.detail() })
		}
	})
}
