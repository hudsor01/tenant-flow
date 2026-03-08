/**
 * Profile Mutation Hooks
 * TanStack Query mutation hooks for user profile management
 *
 * Split from use-profile.ts for the 300-line file size rule.
 * Query hooks remain in use-profile.ts.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mutationKeys } from './mutation-keys'
import { logger } from '#lib/frontend-logger.js'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import type {
	UpdatePhoneInput,
	UpdateProfileInput,
	UserProfile
} from '#types/api-contracts'

import { profileKeys, PROFILE_SELECT, mapUserProfile } from './use-profile'

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Update user profile
 */
export function useUpdateProfileMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.profile.update,
		mutationFn: async (input: UpdateProfileInput): Promise<UserProfile> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')
			const { data, error } = await supabase
				.from('users')
				.update({
					first_name: input.first_name,
					last_name: input.last_name,
					full_name: `${input.first_name} ${input.last_name}`,
					phone: input.phone ?? null,
					updated_at: new Date().toISOString()
				})
				.eq('id', user.id)
				.select(PROFILE_SELECT)
				.single()
			if (error) throw error
			return mapUserProfile(data!)
		},

		onMutate: async newData => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: profileKeys.detail() })

			// Snapshot previous value
			const previousProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail()
			)

			// Optimistically update
			if (previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), {
					...previousProfile,
					first_name: newData.first_name,
					last_name: newData.last_name,
					full_name: `${newData.first_name} ${newData.last_name}`,
					phone: newData.phone ?? null,
					updated_at: new Date().toISOString()
				})
			}

			return { previousProfile }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), context.previousProfile)
			}

			logger.error('Failed to update profile', {
				action: 'update_profile',
				metadata: { error: err }
			})
			handleMutationError(err, 'Update profile')
		},

		onSuccess: () => {
			handleMutationSuccess('Update profile', 'Your profile has been updated')
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.detail() })
		}
	})
}

/**
 * Update phone number
 */
export function useUpdatePhoneMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.profile.updatePhone,
		mutationFn: async (
			input: UpdatePhoneInput
		): Promise<{ phone: string | null }> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')
			const { data, error } = await supabase
				.from('users')
				.update({ phone: input.phone })
				.eq('id', user.id)
				.select('phone')
				.single()
			if (error) throw error
			return data as { phone: string | null }
		},

		onMutate: async newData => {
			await queryClient.cancelQueries({ queryKey: profileKeys.detail() })

			const previousProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail()
			)

			if (previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), {
					...previousProfile,
					phone: newData.phone
				})
			}

			return { previousProfile }
		},

		onError: (err, _variables, context) => {
			if (context?.previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), context.previousProfile)
			}

			logger.error('Failed to update phone', {
				action: 'update_phone',
				metadata: { error: err }
			})
			handleMutationError(err, 'Update phone')
		},

		onSuccess: () => {
			handleMutationSuccess(
				'Update phone',
				'Your phone number has been updated'
			)
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.detail() })
		}
	})
}
