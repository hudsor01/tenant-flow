import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest } from '#lib/api-request'
import { isPostgrestEnabled } from '#lib/postgrest-flag'
import { createClient } from '#lib/supabase/client'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'

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

interface SessionsResponse {
	sessions: UserSession[]
}

const sessionsKey = ['user', 'sessions'] as const

export function useUserSessions() {
	return useQuery({
		queryKey: sessionsKey,
		queryFn: async (): Promise<UserSession[]> => {
			if (isPostgrestEnabled()) {
				// The Supabase Admin API for listing all user sessions requires the service_role key,
				// which cannot be used in a browser client for security reasons. The browser client
				// (anon key) only has access to the current session. We return the current session
				// as a single-item array — listing and revoking other sessions is handled by the
				// NestJS path when PostgREST is disabled.
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
			}

			return apiRequest<SessionsResponse>('/api/v1/users/sessions').then(
				res => res.sessions
			)
		},
		...QUERY_CACHE_TIMES.DETAIL
	})
}

export function useRevokeSessionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.sessions.revoke,
		mutationFn: async (sessionId: string) => {
			if (isPostgrestEnabled()) {
				// The Supabase browser client can only revoke the current session via signOut().
				// Revoking other sessions requires the Admin API (service_role key), which must
				// not be used in the browser. For the PostgREST path, we handle the current
				// session by calling signOut(); all other session IDs fall back to apiRequest.
				const supabase = createClient()
				const {
					data: { session }
				} = await supabase.auth.getSession()

				const isCurrentSession =
					session?.access_token === sessionId || sessionId === 'current'

				if (isCurrentSession) {
					const { error } = await supabase.auth.signOut()
					if (error) throw error
					return { success: true, message: 'Session terminated' }
				}

				// Fall through to apiRequest for non-current sessions — admin access required
			}

			return apiRequest<{ success: boolean; message: string }>(
				`/api/v1/users/sessions/${sessionId}`,
				{
					method: 'DELETE'
				}
			)
		},
		onMutate: async sessionId => {
			await queryClient.cancelQueries({ queryKey: sessionsKey })

			const previous = queryClient.getQueryData<UserSession[]>(sessionsKey)

			if (previous) {
				queryClient.setQueryData<UserSession[]>(sessionsKey, old =>
					old?.filter(session => session.id !== sessionId)
				)
			}

			return { previous }
		},
		onError: (error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(sessionsKey, context.previous)
			}

			handleMutationError(error, 'Revoke session')
		},
		onSuccess: () => {
			handleMutationSuccess(
				'Revoke session',
				'The session has been terminated successfully'
			)
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: sessionsKey })
		}
	})
}
