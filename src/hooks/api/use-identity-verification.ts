import { useMutation, useQuery, useQueryClient, mutationOptions } from '@tanstack/react-query'

import { mutationKeys } from './mutation-keys'
import type { IdentityVerificationSessionPayload } from '#types/stripe'
import { stripeConnectKeys } from './query-keys/stripe-connect-keys'
import { identityVerificationKeys, identityVerificationQueries } from './query-keys/identity-verification-keys'


// ============================================================================
// MUTATION OPTIONS FACTORY
// ============================================================================

const identityVerificationMutationFactories = {
	start: () =>
		mutationOptions<{ success: boolean; data: IdentityVerificationSessionPayload }, unknown, void>({
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
			}
		})
}

// ============================================================================
// HOOKS
// ============================================================================

export function useIdentityVerificationStatus() {
	return useQuery(identityVerificationQueries.status())
}

export function useCreateIdentityVerificationSessionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...identityVerificationMutationFactories.start(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: identityVerificationKeys.status()
			})
			queryClient.invalidateQueries({ queryKey: stripeConnectKeys.account() })
		}
	})
}
