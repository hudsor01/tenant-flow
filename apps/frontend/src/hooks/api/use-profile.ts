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
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { logger } from '@repo/shared/lib/frontend-logger'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'

// ============================================================================
// TYPES
// ============================================================================

/**
 * User profile entity
 */
export interface UserProfile {
	id: string
	email: string
	first_name: string | null
	last_name: string | null
	full_name: string
	phone: string | null
	avatar_url: string | null
	user_type: 'owner' | 'tenant' | 'manager' | 'admin'
	status: string
	created_at: string
	updated_at: string | null
	tenant_profile?: TenantProfile
	owner_profile?: OwnerProfile
}

export interface TenantProfile {
	date_of_birth: string | null
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	emergency_contact_relationship: string | null
	identity_verified: boolean | null
	current_lease?: {
		property_name: string
		unit_number: string
		move_in_date: string
	} | null
}

export interface OwnerProfile {
	stripe_connected: boolean
	properties_count: number
	units_count: number
}

export interface UpdateProfileInput {
	first_name: string
	last_name: string
	email: string
	phone?: string | null
}

export interface UpdatePhoneInput {
	phone: string | null
}

export interface UpdateEmergencyContactInput {
	name: string
	phone: string
	relationship: string
}

export interface AvatarUploadResponse {
	avatar_url: string
}

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
			queryFn: () => apiRequest<UserProfile>('/api/v1/users/profile'),
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
// PREFETCH HOOKS
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
