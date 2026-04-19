import { queryOptions, useQuery } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { createClient } from '#lib/supabase/client'
import type { UserProfile } from '#types/api-contracts'

export const profileKeys = {
	all: ['profile'] as const,
	detail: () => [...profileKeys.all, 'detail'] as const,
	company: () => [...profileKeys.all, 'company'] as const
}

export const PROFILE_SELECT =
	'id, email, first_name, last_name, full_name, phone, avatar_url, is_admin, status, created_at, updated_at, stripe_customer_id'

export function mapUserProfile(row: {
	id: string
	email: string
	first_name: string | null
	last_name: string | null
	full_name: string | null
	phone: string | null
	avatar_url: string | null
	is_admin: boolean
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
		is_admin: row.is_admin,
		status: row.status ?? 'active',
		created_at: row.created_at,
		updated_at: row.updated_at
	} satisfies UserProfile
}

export const profileQueries = {
	all: () => ['profile'] as const,
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

export function useProfile() {
	return useQuery(profileQueries.detail())
}
