import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { mutationKeys } from './mutation-keys'
import type {
	IdentityVerificationRecord,
	IdentityVerificationSessionPayload
} from '#types/stripe'
import { stripeConnectKeys } from './use-stripe-connect'

export const identityVerificationKeys = {
	all: ['identityVerification'] as const,
	status: () => [...identityVerificationKeys.all, 'status'] as const
}

export function useIdentityVerificationStatus() {
	return useQuery({
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

export function useCreateIdentityVerificationSessionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.identityVerification.start,
		mutationFn: async (): Promise<{
			success: boolean
			data: IdentityVerificationSessionPayload
		}> => {
			return {
				success: false,
				data: {
					clientSecret: '',
					sessionId: '',
					status: 'requires_input'
				}
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: identityVerificationKeys.status()
			})
			queryClient.invalidateQueries({ queryKey: stripeConnectKeys.account() })
		}
	})
}
