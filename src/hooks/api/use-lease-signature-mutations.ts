/**
 * Lease Signature Mutation Hooks
 * TanStack Query mutation hooks for DocuSeal lease signature workflows.
 *
 * Split from use-lease-mutations.ts for the 300-line file size rule.
 * CRUD mutations remain in use-lease-mutations.ts.
 *
 * Signature mutations call the docuseal Edge Function via callDocuSealEdgeFunction().
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '#lib/frontend-logger.js'
import { handleMutationError } from '#lib/mutation-error-handler'
import { createClient } from '#lib/supabase/client'

import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'

// ============================================================================
// EDGE FUNCTION HELPER
// ============================================================================

/**
 * Calls the docuseal Edge Function with an action payload.
 * Reads the caller's JWT from the current Supabase session.
 */
async function callDocuSealEdgeFunction(
	action: string,
	payload: Record<string, unknown>
): Promise<{ success: boolean }> {
	const supabase = createClient()
	const { data: sessionData } = await supabase.auth.getSession()
	const token = sessionData.session?.access_token
	if (!token) throw new Error('Not authenticated')

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(`${baseUrl}/functions/v1/docuseal`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ action, ...payload }),
	})

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: response.statusText }))
		throw new Error((error as { error?: string }).error ?? 'DocuSeal request failed')
	}

	return response.json()
}

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
		mutationKey: mutationKeys.leases.sendForSignature,
		mutationFn: ({
			leaseId,
			message,
			missingFields
		}: {
			leaseId: string
			message?: string
			missingFields: {
				immediate_family_members: string
				landlord_notice_address: string
			}
		}) =>
			callDocuSealEdgeFunction('send-for-signature', { leaseId, message, missingFields }),
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
		mutationKey: mutationKeys.leases.sign,
		mutationFn: (leaseId: string) =>
			callDocuSealEdgeFunction('sign-owner', { leaseId }),
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
		mutationKey: mutationKeys.leases.sign,
		mutationFn: (leaseId: string) =>
			callDocuSealEdgeFunction('sign-tenant', { leaseId }),
		onSuccess: (_result, leaseId) => {
			// Invalidate lease detail, signature status, and tenant portal data
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.tenantPortalActive().queryKey
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
		mutationKey: mutationKeys.leases.cancelSignature,
		mutationFn: (leaseId: string) =>
			callDocuSealEdgeFunction('cancel', { leaseId }),
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
		mutationKey: mutationKeys.leases.resendSignature,
		mutationFn: ({ leaseId, message }: { leaseId: string; message?: string }) =>
			callDocuSealEdgeFunction('resend', { leaseId, message }),
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
