/**
 * Session Query Keys & Options
 * queryOptions() factories for user sessions domain.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

export interface UserSession {
	id: string
	user_id: string
	created_at: string
	updated_at: string
	user_agent: string | null
	ip: string | null
	browser: string | null
	os: string | null
	device: string | null
	is_current: boolean
}

export const sessionKeys = {
	all: ['user', 'sessions'] as const
}

export const sessionQueries = {
	list: () =>
		queryOptions({
			queryKey: sessionKeys.all,
			queryFn: async (): Promise<UserSession[]> => {
				// The Supabase Admin API for listing all user sessions requires the service_role key,
				// which cannot be used in a browser client for security reasons. The browser client
				// (anon key) only has access to the current session. We return the current session
				// as a single-item array.
				const supabase = createClient()
				const {
					data: { session }
				} = await supabase.auth.getSession()

				if (!session) {
					return []
				}

				const currentSession: UserSession = {
					id: session.access_token,
					user_id: session.user.id,
					created_at: new Date(session.user.created_at).toISOString(),
					updated_at: new Date().toISOString(),
					user_agent: null,
					ip: null,
					browser: null,
					os: null,
					device: null,
					is_current: true
				}

				return [currentSession]
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
}
