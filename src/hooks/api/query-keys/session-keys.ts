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

/**
 * Decode the `session_id` claim from a Supabase access token. The token is a
 * JWT whose payload (base64url-encoded) includes the `auth.sessions.id` of
 * the issuing session. Returns null if the token is malformed or the claim
 * is missing — callers fall back to `is_current=false` for every row, which
 * the UI handles gracefully.
 *
 * Exported so the revoke mutation can re-derive at fire time instead of
 * trusting a stale `is_current` flag from the listing.
 */
export function decodeSessionIdFromAccessToken(
	accessToken: string
): string | null {
	try {
		const parts = accessToken.split('.')
		if (parts.length !== 3) return null
		const payloadB64 = parts[1]
		if (!payloadB64) return null
		// Convert base64url → base64 for atob
		const padded = payloadB64
			.replace(/-/g, '+')
			.replace(/_/g, '/')
			.padEnd(payloadB64.length + ((4 - (payloadB64.length % 4)) % 4), '=')
		const json = JSON.parse(atob(padded)) as { session_id?: unknown }
		return typeof json.session_id === 'string' ? json.session_id : null
	} catch {
		return null
	}
}

export const sessionQueries = {
	list: () =>
		queryOptions({
			queryKey: sessionKeys.all,
			queryFn: async (): Promise<UserSession[]> => {
				// Calls the public.get_user_sessions(p_user_id) RPC, which is
				// SECURITY DEFINER and reads from auth.sessions filtered by
				// auth.uid()-equality. Returns real auth.sessions UUIDs so revoke
				// (use-sessions.ts) can hand them straight to revoke_user_session.
				// The current session is identified by decoding the `session_id`
				// claim from the access token JWT and matching against row.id.
				const supabase = createClient()
				const {
					data: { session }
				} = await supabase.auth.getSession()

				if (!session) {
					return []
				}

				const currentSessionId = decodeSessionIdFromAccessToken(
					session.access_token
				)

				const { data, error } = await supabase.rpc('get_user_sessions', {
					p_user_id: session.user.id
				})

				if (error) {
					throw error
				}

				const rows =
					(data as Array<{
						id: string
						user_id: string
						created_at: string
						updated_at: string
						user_agent: string | null
						ip: string | null
					}> | null) ?? []

				return rows.map(row => ({
					id: row.id,
					user_id: row.user_id,
					created_at: row.created_at,
					updated_at: row.updated_at,
					user_agent: row.user_agent,
					ip: row.ip,
					// Browser/OS/device parsing from user_agent is left to the UI layer
					// (or a future enhancement) — the auth.sessions row doesn't carry
					// these fields directly.
					browser: null,
					os: null,
					device: null,
					is_current: currentSessionId !== null && row.id === currentSessionId
				}))
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
}
