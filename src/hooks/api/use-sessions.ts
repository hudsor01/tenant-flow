import { useMutation, useQuery, useQueryClient, mutationOptions } from '@tanstack/react-query'

import { createClient } from '#lib/supabase/client'
import { mutationKeys } from './mutation-keys'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { sessionKeys, sessionQueries, type UserSession } from './query-keys/session-keys'


const sessionMutationFactories = {
	revoke: () =>
		mutationOptions({
			mutationKey: mutationKeys.sessions.revoke,
			mutationFn: async (sessionId: string) => {
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

				// Revoking non-current sessions requires the Admin API (service_role key),
				// which cannot be used in the browser client. NestJS backend has been removed.
				throw new Error(
					'Revoking non-current sessions requires admin access — not available in this version'
				)
			}
		})
}

export function useUserSessions() {
	return useQuery(sessionQueries.list())
}

export function useRevokeSessionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...sessionMutationFactories.revoke(),
		onMutate: async sessionId => {
			await queryClient.cancelQueries({ queryKey: sessionKeys.all })

			const previous = queryClient.getQueryData<UserSession[]>(sessionKeys.all)

			if (previous) {
				queryClient.setQueryData<UserSession[]>(sessionKeys.all, old =>
					old?.filter(session => session.id !== sessionId)
				)
			}

			return { previous }
		},
		onError: (error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(sessionKeys.all, context.previous)
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
			queryClient.invalidateQueries({ queryKey: sessionKeys.all })
		}
	})
}
