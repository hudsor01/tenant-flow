/**
 * Lease Mutation Hooks
 * TanStack Query mutation hooks for lease management
 *
 * Split from use-lease.ts for the 300-line file size rule.
 * Query hooks remain in use-lease.ts.
 *
 * CRUD mutations use PostgREST direct via supabase-js.
 * Signature mutations call the docuseal Edge Function via callDocuSealEdgeFunction().
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '#shared/lib/frontend-logger'
import type { Lease } from '#shared/types/core'
import type { LeaseCreate, LeaseUpdate } from '#shared/validation/leases'
import { handleMutationError } from '#lib/mutation-error-handler'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { tenantQueries } from './query-keys/tenant-keys'
import { unitQueries } from './query-keys/unit-keys'
import { toast } from 'sonner'

import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

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
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook to delete a lease with optimistic removal
 */
export function useDeleteLeaseOptimisticMutation(options?: {
	onSuccess?: () => void
	onError?: (error: Error) => void
}) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.delete,
		mutationFn: async (id: string): Promise<string> => {
			const supabase = createClient()
			// Soft-delete: set lease_status to inactive (financial record retention)
			const { error } = await supabase
				.from('leases')
				.update({ lease_status: 'inactive' })
				.eq('id', id)

			if (error) handlePostgrestError(error, 'leases')
			return id
		},
		onMutate: async (id: string) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: leaseQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: leaseQueries.lists() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Lease>(
				leaseQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<{
				data: Lease[]
				total?: number
				limit?: number
				offset?: number
			}>({ queryKey: leaseQueries.lists() })

			// Optimistically remove from all caches
			queryClient.removeQueries({ queryKey: leaseQueries.detail(id).queryKey })
			queryClient.setQueriesData<{
				data: Lease[]
				total?: number
				limit?: number
				offset?: number
			}>({ queryKey: leaseQueries.lists() }, old =>
				old
					? {
							...old,
							data: old.data.filter(lease => lease.id !== id),
							total: (old.total ?? old.data.length) - 1
						}
					: old
			)

			return { previousDetail, previousLists }
		},
		onError: (err, id, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					leaseQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to delete lease', {
				lease_id: id,
				error: err instanceof Error ? err.message : String(err)
			})

			options?.onError?.(err instanceof Error ? err : new Error(String(err)))
		},
		onSuccess: id => {
			logger.info('Lease deleted successfully', { lease_id: id })
			options?.onSuccess?.()
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.stats().queryKey })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
		}
	})
}

/**
 * Create lease mutation
 */
export function useCreateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.create,
		mutationFn: async (data: LeaseCreate): Promise<Lease> => {
			const supabase = createClient()
			const user = await getCachedUser()
			const ownerId = requireOwnerUserId(user?.id)

			// Omit tenant_ids (form-only field) before inserting into DB
			const { tenant_ids: _tenant_ids, ...leaseData } = data

			const { data: created, error } = await supabase
				.from('leases')
				.insert({ ...leaseData, owner_user_id: ownerId })
				.select()
				.single()

			if (error) handlePostgrestError(error, 'leases')

			return created as unknown as Lease
		},
		onSuccess: _newLease => {
			// Invalidate lease, tenant, and unit lists
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease created successfully')
		},
		onError: error => {
			handleMutationError(error, 'Create lease')
		}
	})
}

/**
 * Update lease mutation
 */
export function useUpdateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.update,
		mutationFn: async ({
			id,
			data,
			version
		}: {
			id: string
			data: LeaseUpdate
			version?: number
		}): Promise<Lease> => {
			const supabase = createClient()
			const payload = version ? { ...data, version } : { ...data }
			const { data: updated, error } = await supabase
				.from('leases')
				.update(payload)
				.eq('id', id)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'leases')

			return updated as unknown as Lease
		},
		onSuccess: updatedLease => {
			// Update the specific lease in cache
			queryClient.setQueryData(
				leaseQueries.detail(updatedLease.id).queryKey,
				updatedLease
			)
			// Invalidate lists
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update lease')
		}
	})
}

/**
 * Terminate lease mutation
 */
export function useTerminateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.terminate,
		mutationFn: async (id: string): Promise<Lease> => {
			const supabase = createClient()
			const { data: updated, error } = await supabase
				.from('leases')
				.update({ lease_status: 'terminated', end_date: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'leases')

			return updated as unknown as Lease
		},
		onSuccess: _terminatedLease => {
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease terminated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Terminate lease')
		}
	})
}

/**
 * Renew lease mutation
 */
export function useRenewLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.renew,
		mutationFn: async ({ id, data }: { id: string; data: { end_date: string } }): Promise<Lease> => {
			const supabase = createClient()
			const { data: updated, error } = await supabase
				.from('leases')
				.update({ end_date: data.end_date, lease_status: 'active' })
				.eq('id', id)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'leases')

			return updated as unknown as Lease
		},
		onSuccess: renewedLease => {
			queryClient.setQueryData(
				leaseQueries.detail(renewedLease.id).queryKey,
				renewedLease
			)
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease renewed successfully')
		},
		onError: error => {
			handleMutationError(error, 'Renew lease')
		}
	})
}

/**
 * Delete lease mutation (simplified version)
 * Use useDeleteLeaseOptimisticMutation for optimistic updates
 */
export function useDeleteLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.delete,
		mutationFn: async (id: string): Promise<void> => {
			const supabase = createClient()
			// Soft-delete: set lease_status to inactive (financial record retention)
			const { error } = await supabase
				.from('leases')
				.update({ lease_status: 'inactive' })
				.eq('id', id)

			if (error) handlePostgrestError(error, 'leases')
		},
		onSuccess: (_result, deletedId) => {
			// Remove from cache
			queryClient.removeQueries({
				queryKey: leaseQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease deleted successfully')
		},
		onError: error => {
			handleMutationError(error, 'Delete lease')
		}
	})
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
