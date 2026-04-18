/**
 * Lease Signature Mutation Hooks
 * TanStack Query mutation hooks for DocuSeal lease signature workflows.
 *
 * Split from use-lease-mutations.ts for the 300-line file size rule.
 * CRUD mutations remain in use-lease-mutations.ts.
 *
 * mutationFn logic lives in leaseMutations factories (query-keys/lease-mutation-options.ts).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '#lib/frontend-logger'
import { handleMutationError } from '#lib/mutation-error-handler'

import { leaseQueries } from './query-keys/lease-keys'
import { leaseMutations } from './query-keys/lease-mutation-options'

// ============================================================================
// LEASE SIGNATURE WORKFLOW HOOKS
// DocuSeal signature operations call the docuseal Supabase Edge Function.
// ============================================================================

/**
 * Hook to send a lease for signature (owner action)
 * Calls the docuseal Edge Function with action=send-for-signature.
 */
export function useSendLeaseForSignatureMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.sendForSignature(),
		onSuccess: (_result, { leaseId }) => {
			// Invalidate lease detail and signature status
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			logger.info('Lease sent for signature', { leaseId })
		},
		onError: err => {
			handleMutationError(err, 'Send lease for signature')
		}
	})
}

/**
 * Hook for owner to sign a lease
 * Calls the docuseal Edge Function with action=sign-owner.
 */
export function useSignLeaseAsOwnerMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.signAsOwner(),
		onSuccess: (_result, leaseId) => {
			// Invalidate lease detail and signature status
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			logger.info('Lease signed by owner', { leaseId })
		},
		onError: err => {
			handleMutationError(err, 'Sign lease')
		}
	})
}

/**
 * Hook for tenant to sign a lease
 * Calls the docuseal Edge Function with action=sign-tenant.
 */
export function useSignLeaseAsTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.signAsTenant(),
		onSuccess: (_result, leaseId) => {
			// Invalidate lease detail, signature status, and list
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			logger.info('Lease signed by tenant', { leaseId })
		},
		onError: err => {
			handleMutationError(err, 'Sign lease')
		}
	})
}

/**
 * Cancel a pending signature request - archives DocuSeal submission, reverts lease to draft.
 * Calls the docuseal Edge Function with action=cancel.
 */
export function useCancelSignatureRequestMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.cancelSignature(),
		onSuccess: (_result, leaseId) => {
			// Invalidate lease detail and signature status
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			logger.info('Signature request cancelled', { leaseId })
		},
		onError: err => {
			handleMutationError(err, 'Cancel signature request')
		}
	})
}

/**
 * Resend signature request - resends emails to pending DocuSeal submitters.
 * Calls the docuseal Edge Function with action=resend.
 */
export function useResendSignatureRequestMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.resendSignature(),
		onSuccess: (_result, { leaseId }) => {
			// Invalidate lease detail and signature status
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			logger.info('Signature request resent', { leaseId })
		},
		onError: err => {
			handleMutationError(err, 'Resend signature request')
		}
	})
}
