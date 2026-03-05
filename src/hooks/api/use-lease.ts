/**
 * Lease Hooks & Query Options
 * TanStack Query hooks for lease management
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * CRUD mutations use PostgREST direct via supabase-js.
 * Signature mutations call the docuseal Edge Function via callDocuSealEdgeFunction().
 *
 * Query keys are in a separate file to avoid circular dependencies.
 */

import { useEffect } from 'react'
import { useMutation, usePrefetchQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '#shared/lib/frontend-logger'
import type { Lease } from '#shared/types/core'
import type { LeaseCreate, LeaseUpdate } from '#shared/validation/leases'
import { handleMutationError } from '#lib/mutation-error-handler'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { maintenanceQueries } from './query-keys/maintenance-keys'
import { tenantQueries } from './query-keys/tenant-keys'
import { unitQueries } from './query-keys/unit-keys'
import { toast } from 'sonner'

// Import query keys from separate file to avoid circular dependency
import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch lease by ID
 * Uses placeholderData from list cache for instant detail view
 */
export function useLease(id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		...leaseQueries.detail(id),
		placeholderData: () => {
			// Search all list caches for this lease
			const listCaches = queryClient.getQueriesData<{
				data: Lease[]
			}>({
				queryKey: leaseQueries.lists()
			})

			for (const [, response] of listCaches) {
				const item = response?.data?.find(l => l.id === id)
				if (item) return item
			}
			return undefined
		}
	})
}

/**
 * Hook to fetch user's current active lease
 */
export function useCurrentLease() {
	return useQuery(leaseQueries.tenantPortalActive())
}

/**
 * Hook to fetch maintenance requests for the current tenant's lease
 * Filters maintenance requests by the tenant's unit from their active lease
 */
export function useTenantMaintenanceRequests() {
	return useQuery(maintenanceQueries.tenantPortal())
}

/**
 * Hook to fetch lease list with pagination and filtering
 */
export function useLeaseList(params?: {
	status?: string
	search?: string
	limit?: number
	offset?: number
}) {
	const { status, search, limit = 50, offset = 0 } = params || {}
	const queryClient = useQueryClient()

	const listQuery = leaseQueries.list({
		...(status && { status }),
		...(search && { search }),
		limit,
		offset
	})

	const query = useQuery({
		...listQuery,
		structuralSharing: true
	})

	useEffect(() => {
		if (query.data?.data) {
			for (const lease of query.data.data) {
				queryClient.setQueryData(leaseQueries.detail(lease.id).queryKey, lease)
			}
		}
	}, [query.data, queryClient])

	return query
}

/**
 * Hook to fetch expiring leases
 */
export function useExpiringLeases(daysUntilExpiry: number = 30) {
	return useQuery(leaseQueries.expiring(daysUntilExpiry))
}

/**
 * Hook to fetch lease statistics
 */
export function useLeaseStats() {
	return useQuery(leaseQueries.stats())
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
// UTILITY HOOKS
// ============================================================================

/**
 * Declarative prefetch hook for lease detail
 * Prefetches when component mounts (route-level prefetching)
 *
 * For imperative prefetching (e.g., on hover), use:
 * queryClient.prefetchQuery(leaseQueries.detail(id))
 */
export function usePrefetchLeaseDetail(id: string) {
	usePrefetchQuery(leaseQueries.detail(id))
}

// ============================================================================
// LEASE SIGNATURE WORKFLOW HOOKS
// DocuSeal signature operations call the docuseal Supabase Edge Function.
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

/**
 * Hook to fetch signature status for a lease
 */
export function useLeaseSignatureStatus(leaseId: string) {
	return useQuery(leaseQueries.signatureStatus(leaseId))
}

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

/**
 * Hook to get signed document URL for download.
 * Reads docuseal_submission_id, owner_signed_at, tenant_signed_at from leases table.
 * Returns a pending: prefix URL when submission exists and both parties signed.
 * Full signed document URL is wired up in Phase 55-03 (docuseal-webhook plan).
 */
export function useSignedDocumentUrl(leaseId: string, enabled = true) {
	return useQuery({
		queryKey: [...leaseQueries.all(), leaseId, 'signed-document'],
		queryFn: async (): Promise<{ document_url: string | null }> => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('leases')
				.select('docuseal_submission_id, owner_signed_at, tenant_signed_at')
				.eq('id', leaseId)
				.single()
			if (error) handlePostgrestError(error, 'leases')
			const row = data as {
				docuseal_submission_id: string | null
				owner_signed_at: string | null
				tenant_signed_at: string | null
			}
			// Document URL available only when submission exists and both parties have signed.
			// Full URL returned by docuseal-webhook plan when it wires up the signed doc URL.
			return {
				document_url:
					row?.docuseal_submission_id && row.owner_signed_at && row.tenant_signed_at
						? `pending:${row.docuseal_submission_id}`
						: null,
			}
		},
		enabled: enabled && !!leaseId,
		staleTime: 5 * 60 * 1000 // 5 minutes
	})
}
