import { useMutation, useQuery, useQueryClient, mutationOptions } from '@tanstack/react-query'

import { createClient } from '#lib/supabase/client'
import { mutationKeys } from './mutation-keys'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import {
	decodeSessionIdFromAccessToken,
	sessionKeys,
	sessionQueries,
	type UserSession
} from './query-keys/session-keys'


export interface RevokeSessionInput {
	/** auth.sessions.id UUID returned by get_user_sessions RPC. */
	id: string
	/**
	 * UI hint from the listing's `is_current` flag (decoded at list time).
	 * The mutation re-derives the current-session match from a fresh JWT
	 * decode at fire time — this field is advisory only, used for fast-path
	 * UX (e.g. confirmation prompt). Never the sole signal.
	 */
	isCurrent: boolean
}

const sessionMutationFactories = {
	revoke: () =>
		mutationOptions({
			mutationKey: mutationKeys.sessions.revoke,
			mutationFn: async (input: RevokeSessionInput) => {
				const supabase = createClient()

				const {
					data: { session }
				} = await supabase.auth.getSession()

				// Re-derive whether `input.id` is the browser's current session at
				// fire time. The listing's `is_current` is computed from the same
				// decode, but if `decodeSessionIdFromAccessToken` returned null on
				// the listing fetch (rare — custom_access_token_hook stripping
				// claims, or other JWT-shape changes), every row would carry
				// is_current=false even for the actual current session. Using
				// `input.isCurrent || sessionMatchesCurrent` covers both:
				//  - normal: is_current=true → fast-path signOut
				//  - decode-failed-at-list-time: row carries false but the fresh
				//    decode here matches → still routed to signOut
				const currentSessionId = session
					? decodeSessionIdFromAccessToken(session.access_token)
					: null
				const isOwnCurrentSession =
					input.isCurrent ||
					(currentSessionId !== null && currentSessionId === input.id)

				if (isOwnCurrentSession) {
					// Current session: signOut() handles both the server-side delete
					// (gotrue removes the auth.sessions row) and the client-side
					// cleanup (clears localStorage tokens + cookies + caches).
					const { error } = await supabase.auth.signOut()
					if (error) throw error
					return { success: true, message: 'Session terminated' }
				}

				// Non-current sessions: SECURITY DEFINER RPC validates auth.uid() ==
				// session.user_id and deletes the row from auth.sessions. The user's
				// other device will fail its next token refresh.
				const {
					data: { user },
					error: userError
				} = await supabase.auth.getUser()
				if (userError) throw userError
				if (!user) throw new Error('Not authenticated')

				const { error } = await supabase.rpc('revoke_user_session', {
					p_user_id: user.id,
					p_session_id: input.id
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
		onMutate: async input => {
			await queryClient.cancelQueries({ queryKey: sessionKeys.all })

			const previous = queryClient.getQueryData<UserSession[]>(sessionKeys.all)

			if (previous) {
				queryClient.setQueryData<UserSession[]>(sessionKeys.all, old =>
					old?.filter(session => session.id !== input.id)
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
