/**
 * Profile Hooks
 *
 * TanStack Query hooks for user profile management.
 * Supports profile viewing, editing, avatar upload, and role-specific fields.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { logger } from '@repo/shared/lib/frontend-logger'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import {
	profileQueries,
	profileKeys,
	type UserProfile,
	type UpdateProfileInput,
	type UpdatePhoneInput,
	type UpdateEmergencyContactInput,
	type AvatarUploadResponse
} from './queries/profile-queries'

// Note: Import profile types directly from './queries/profile-queries'
// No re-exports per CLAUDE.md rules

// ============================================================================
// Query Hooks
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
// Mutation Hooks
// ============================================================================

/**
 * Update user profile
 */
export function useUpdateProfile() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: UpdateProfileInput) =>
			apiRequest<UserProfile>('/api/v1/users/profile', {
				method: 'PATCH',
				body: JSON.stringify(input)
			}),

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
export function useUploadAvatar() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (file: File) => {
			const formData = new FormData()
			formData.append('avatar', file)

			// Use fetch directly for FormData
			const response = await fetch('/api/v1/users/avatar', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to upload avatar')
			}

			return response.json() as Promise<AvatarUploadResponse>
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
export function useRemoveAvatar() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			apiRequest<{ success: boolean; message: string }>(
				'/api/v1/users/avatar',
				{ method: 'DELETE' }
			),

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
export function useUpdatePhone() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: UpdatePhoneInput) =>
			apiRequest<{ phone: string | null }>('/api/v1/users/phone', {
				method: 'PATCH',
				body: JSON.stringify(input)
			}),

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
 */
export function useUpdateProfileEmergencyContact() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: UpdateEmergencyContactInput) =>
			apiRequest<{ success: boolean; message: string }>(
				'/api/v1/users/emergency-contact',
				{
					method: 'PATCH',
					body: JSON.stringify(input)
				}
			),

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
 */
export function useRemoveProfileEmergencyContact() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			apiRequest<{ success: boolean; message: string }>(
				'/api/v1/users/emergency-contact',
				{ method: 'DELETE' }
			),

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

// ============================================================================
// Prefetch Hooks
// ============================================================================

/**
 * Prefetch user profile for faster navigation
 */
export function usePrefetchProfile() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(profileQueries.detail())
	}
}
