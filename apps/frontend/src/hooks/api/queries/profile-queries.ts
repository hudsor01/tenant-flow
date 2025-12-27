/**
 * Profile Query Definitions
 *
 * Query keys and query options for user profile data.
 * Following TanStack Query v5 patterns.
 */

import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { queryOptions } from '@tanstack/react-query'

// ============================================================================
// Types
// ============================================================================

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
// Query Keys
// ============================================================================

export const profileKeys = {
	all: ['profile'] as const,
	detail: () => [...profileKeys.all, 'detail'] as const
}

// ============================================================================
// Query Options
// ============================================================================

export const profileQueries = {
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
