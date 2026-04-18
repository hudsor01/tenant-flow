/**
 * Identity Verification Query Keys & Options
 * queryOptions() factories for identity verification domain.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { IdentityVerificationRecord } from '#types/stripe'

export const identityVerificationKeys = {
	all: ['identityVerification'] as const,
	status: () => [...identityVerificationKeys.all, 'status'] as const
}

export const identityVerificationQueries = {
	/**
	 * Get identity verification status for the current user
	 */
	status: () =>
		queryOptions({
			queryKey: identityVerificationKeys.status(),
			queryFn: async (): Promise<IdentityVerificationRecord> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				const { data, error } = await supabase
					.from('users')
					.select(
						'identity_verification_status, identity_verification_session_id, identity_verification_data, identity_verification_error, identity_verified_at'
					)
					.eq('id', user.id)
					.single()

				if (error) throw error

				return {
					sessionId: data.identity_verification_session_id,
					status: data.identity_verification_status,
					verifiedAt: data.identity_verified_at,
					lastError: data.identity_verification_error,
					data: data.identity_verification_data
				}
			},
			...QUERY_CACHE_TIMES.SECURITY
		})
}
