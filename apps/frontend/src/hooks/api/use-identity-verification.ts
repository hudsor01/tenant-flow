import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type {
	IdentityVerificationRecord,
	IdentityVerificationSessionPayload
} from '@repo/shared/types/identity'
import { stripeConnectKeys } from './use-stripe-connect'

export const identityVerificationKeys = {
	all: ['identityVerification'] as const,
	status: () => [...identityVerificationKeys.all, 'status'] as const
}

export function useIdentityVerificationStatus() {
	return useQuery({
		queryKey: identityVerificationKeys.status(),
		queryFn: async (): Promise<IdentityVerificationRecord> => {
			const response = await clientFetch<{
				success: boolean
				data: IdentityVerificationRecord
			}>('/api/v1/identity/verification-status')

			return response.data
		},
		...QUERY_CACHE_TIMES.SECURITY
	})
}

export function useCreateIdentityVerificationSession() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async () => {
			return clientFetch<{
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
