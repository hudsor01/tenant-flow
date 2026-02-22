import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'

import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { isPostgrestEnabled } from '#lib/postgrest-flag'
import { createClient } from '#lib/supabase/client'
import { mutationKeys } from './mutation-keys'
import type {
	IdentityVerificationRecord,
	IdentityVerificationSessionPayload
} from '@repo/shared/types/stripe'
import { stripeConnectKeys } from './use-stripe-connect'

export const identityVerificationKeys = {
	all: ['identityVerification'] as const,
	status: () => [...identityVerificationKeys.all, 'status'] as const
}

export function useIdentityVerificationStatus() {
	return useQuery({
		queryKey: identityVerificationKeys.status(),
		queryFn: async (): Promise<IdentityVerificationRecord> => {
			if (isPostgrestEnabled()) {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
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
			}

			// NestJS path (legacy)
			const response = await apiRequest<{
				success: boolean
				data: IdentityVerificationRecord
			}>('/api/v1/identity/verification-status')

			return response.data
		},
		...QUERY_CACHE_TIMES.SECURITY
	})
}

export function useCreateIdentityVerificationSessionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.identityVerification.start,
		mutationFn: async () => {
			// Session creation requires server-side Stripe API — stays on NestJS until Phase 55 Edge Functions
			return apiRequest<{
				success: boolean
				data: IdentityVerificationSessionPayload
			}>('/api/v1/identity/verification-session', {
				method: 'POST'
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: identityVerificationKeys.status()
			})
			queryClient.invalidateQueries({ queryKey: stripeConnectKeys.account() })
		}
	})
}
