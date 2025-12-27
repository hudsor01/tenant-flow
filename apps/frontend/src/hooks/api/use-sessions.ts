import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest } from '#lib/api-request'
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
		queryFn: () =>
			apiRequest<SessionsResponse>('/api/v1/users/sessions').then(
				res => res.sessions
			),
		...QUERY_CACHE_TIMES.DETAIL,
		retry: 2
	})
}

export function useRevokeSession() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (sessionId: string) =>
			apiRequest<{ success: boolean; message: string }>(
				`/api/v1/users/sessions/${sessionId}`,
				{
					method: 'DELETE'
				}
			),
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
