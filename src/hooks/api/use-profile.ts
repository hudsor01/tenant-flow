/**
 * Profile Hooks & Query Options
 * TanStack Query hooks for user profile management with colocated query options
 *
 * Supports profile viewing, editing, avatar upload, and role-specific fields.
 *
 * React 19 + TanStack Query v5 patterns
 */

import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { logger } from '#shared/lib/frontend-logger'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import type {
	AvatarUploadResponse,
	SetEmergencyContactInput,
	UpdatePhoneInput,
	UpdateProfileInput,
	UserProfile
} from '#shared/types/api-contracts'

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Profile query keys for cache management
 */
export const profileKeys = {
	all: ['profile'] as const,
	detail: () => [...profileKeys.all, 'detail'] as const
}

// ============================================================================
// MAPPER
// ============================================================================

const PROFILE_SELECT =
	'id, email, first_name, last_name, full_name, phone, avatar_url, user_type, status, created_at, updated_at, stripe_customer_id'

/**
 * Maps a PostgREST users row to UserProfile.
 * Handles user_type union literal that PostgREST returns as plain string.
 */
function mapUserProfile(row: {
	id: string
	email: string
	first_name: string | null
	last_name: string | null
	full_name: string | null
	phone: string | null
	avatar_url: string | null
	user_type: string | null
	status: string | null
	created_at: string
	updated_at: string
	stripe_customer_id: string | null
}): UserProfile {
	return {
		id: row.id,
		email: row.email,
		first_name: row.first_name,
		last_name: row.last_name,
		full_name: row.full_name ?? '',
		phone: row.phone,
		avatar_url: row.avatar_url,
		user_type: row.user_type as UserProfile['user_type'],
		status: row.status ?? 'active',
		created_at: row.created_at,
		updated_at: row.updated_at
	} satisfies UserProfile
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Profile query factory
 */
export const profileQueries = {
	/**
	 * Base key for all profile queries
	 */
	all: () => ['profile'] as const,

	/**
	 * Fetch current user's profile with role-specific data
	 */
	detail: () =>
		queryOptions({
			queryKey: profileKeys.detail(),
			queryFn: async (): Promise<UserProfile> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('users')
					.select(PROFILE_SELECT)
					.single()
				if (error) throw error
				return mapUserProfile(data!)
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch current user's profile with role-specific data
 *
 * Returns:
 * - Base user info (name, email, phone, avatar)
 * - For tenants: emergency contact, current lease info
 * - For owners: Stripe connection status, property/unit counts
 */
export function useProfile() {
	return useQuery(profileQueries.detail())
}

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
 * Upload avatar image
 */
export function useUploadAvatarMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.profile.uploadAvatar,
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
		mutationKey: mutationKeys.profile.deleteAvatar,
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

/**
 * Update emergency contact (for tenants)
 * Emergency contact data lives on the tenants table (not users table)
 */
export function useUpdateProfileEmergencyContactMutation() {
	const queryClient = useQueryClient()

	return useMutation({
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
		},

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
		},

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
