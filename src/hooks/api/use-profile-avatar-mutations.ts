/**
 * Profile Avatar Mutation Hooks
 * TanStack Query mutation hooks for avatar upload and removal.
 *
 * Split from use-profile-mutations.ts for the 300-line file size rule.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '#shared/lib/frontend-logger'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import type {
	AvatarUploadResponse,
	UserProfile
} from '#shared/types/api-contracts'

import { profileKeys } from './use-profile'

/**
 * Upload avatar image
 */
export function useUploadAvatarMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (file: File): Promise<AvatarUploadResponse> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const ext = file.name.split('.').pop() ?? 'jpg'
			const path = `${user.id}/avatar.${ext}`

			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(path, file, { upsert: true, contentType: file.type })
			if (uploadError) throw uploadError

			const {
				data: { publicUrl }
			} = supabase.storage.from('avatars').getPublicUrl(path)

			const { error: updateError } = await supabase
				.from('users')
				.update({ avatar_url: publicUrl })
				.eq('id', user.id)
			if (updateError) throw updateError

			return { avatar_url: publicUrl }
		},

		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: profileKeys.detail() })

			const previousProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail()
			)

			return { previousProfile }
		},

		onError: (err, _variables, context) => {
			if (context?.previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), context.previousProfile)
			}

			logger.error('Failed to upload avatar', {
				action: 'upload_avatar',
				metadata: { error: err }
			})
			handleMutationError(err, 'Upload avatar')
		},

		onSuccess: data => {
			// Update cache with new avatar URL
			const currentProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail()
			)
			if (currentProfile) {
				queryClient.setQueryData(profileKeys.detail(), {
					...currentProfile,
					avatar_url: data.avatar_url
				})
			}

			handleMutationSuccess('Upload avatar', 'Your avatar has been updated')
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.detail() })
		}
	})
}

/**
 * Remove avatar image
 */
export function useRemoveAvatarMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (): Promise<{ success: boolean; message: string }> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const { error } = await supabase
				.from('users')
				.update({ avatar_url: null })
				.eq('id', user.id)
			if (error) throw error

			// Best-effort storage cleanup — don't throw if listing/removing fails
			try {
				const { data: files } = await supabase.storage
					.from('avatars')
					.list(user.id)
				if (files && files.length > 0) {
					const paths = files
						.filter(f => f.name.startsWith('avatar.'))
						.map(f => `${user.id}/${f.name}`)
					if (paths.length > 0) {
						await supabase.storage.from('avatars').remove(paths)
					}
				}
			} catch {
				// Storage cleanup is best-effort
			}

			return { success: true, message: 'Avatar removed' }
		},

		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: profileKeys.detail() })

			const previousProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail()
			)

			// Optimistically clear avatar
			if (previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), {
					...previousProfile,
					avatar_url: null
				})
			}

			return { previousProfile }
		},

		onError: (err, _variables, context) => {
			if (context?.previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), context.previousProfile)
			}

			logger.error('Failed to remove avatar', {
				action: 'remove_avatar',
				metadata: { error: err }
			})
			handleMutationError(err, 'Remove avatar')
		},

		onSuccess: () => {
			handleMutationSuccess('Remove avatar', 'Your avatar has been removed')
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.detail() })
		}
	})
}
