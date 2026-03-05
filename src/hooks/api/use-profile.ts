/**
 * Profile Query Hooks & Query Options
 * TanStack Query hooks for user profile data fetching
 *
 * Mutation hooks are in use-profile-mutations.ts.
 *
 * Supports profile viewing with role-specific fields.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions, useQuery } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { createClient } from '#lib/supabase/client'
import type { UserProfile } from '#shared/types/api-contracts'

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Profile query keys for cache management
 */
export const profileKeys = {
	all: ['profile'] as const,
	detail: () => [...profileKeys.all, 'detail'] as const,
	company: () => [...profileKeys.all, 'company'] as const
}

// ============================================================================
// MAPPER (exported for use by mutation file)
// ============================================================================

export const PROFILE_SELECT =
	'id, email, first_name, last_name, full_name, phone, avatar_url, user_type, status, created_at, updated_at, stripe_customer_id'

/**
 * Maps a PostgREST users row to UserProfile.
 * Handles user_type union literal that PostgREST returns as plain string.
 */
export function mapUserProfile(row: {
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
