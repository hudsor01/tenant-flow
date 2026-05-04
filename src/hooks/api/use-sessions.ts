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

				// Non-current sessions are revoked via the public.revoke_user_session
				// SECURITY DEFINER RPC, which validates that auth.uid() matches the
				// session's user_id before deleting from auth.sessions. Closes F-4
				// from the 2026-05-03 audit (previously this path threw).
				const {
					data: { user },
					error: userError
				} = await supabase.auth.getUser()
				if (userError) throw userError
				if (!user) throw new Error('Not authenticated')

				const { error } = await supabase.rpc('revoke_user_session', {
					p_user_id: user.id,
					p_session_id: sessionId
				})
				if (error) throw error

				return { success: true, message: 'Session terminated' }
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
