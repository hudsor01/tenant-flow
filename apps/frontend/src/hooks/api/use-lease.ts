/**
 * Lease Hooks & Query Options
 * TanStack Query hooks for lease management
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Query keys are in a separate file to avoid circular dependencies.
 */

import { useMutation, usePrefetchQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { Lease } from '@repo/shared/types/core'
import type { LeaseCreate, LeaseUpdate } from '@repo/shared/validation/leases'
import { handleMutationError } from '#lib/mutation-error-handler'
import { apiRequest } from '#lib/api-request'
import { useUser } from '#hooks/api/use-auth'
import { maintenanceQueries } from './query-keys/maintenance-keys'
import { tenantQueries } from './query-keys/tenant-keys'
import { unitQueries } from './query-keys/unit-keys'
import { toast } from 'sonner'

// Import query keys from separate file to avoid circular dependency
import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'

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

	return useQuery({
		...listQuery,
		select: response => {
			response?.data?.forEach?.(lease => {
				queryClient.setQueryData(leaseQueries.detail(lease.id).queryKey, lease)
			})

			return response
		},
		structuralSharing: true
	})
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
			await apiRequest(`/api/v1/leases/${id}`, {
				method: 'DELETE'
			})
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
		}
	})
}

/**
 * Create lease mutation
 */
export function useCreateLeaseMutation() {
	const queryClient = useQueryClient()
	const { data: user } = useUser()

	return useMutation({
		mutationKey: mutationKeys.leases.create,
		mutationFn: (data: LeaseCreate) =>
			apiRequest<Lease>('/api/v1/leases', {
				method: 'POST',
				body: JSON.stringify({
					...data,
					owner_user_id: user?.id
				})
			}),
		onSuccess: _newLease => {
			// Invalidate lease, tenant, and unit lists
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
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
		mutationFn: ({
			id,
			data,
			version
		}: {
			id: string
			data: LeaseUpdate
			version?: number
		}) =>
			apiRequest<Lease>(`/api/v1/leases/${id}`, {
				method: 'PUT',
				body: JSON.stringify(version ? { ...data, version } : data)
			}),
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
		mutationFn: (id: string) =>
			apiRequest<Lease>(`/api/v1/leases/${id}/terminate`, {
				method: 'POST'
			}),
		onSuccess: _terminatedLease => {
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
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
		mutationFn: ({ id, data }: { id: string; data: { end_date: string } }) =>
			apiRequest<Lease>(`/api/v1/leases/${id}/renew`, {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: renewedLease => {
			queryClient.setQueryData(
				leaseQueries.detail(renewedLease.id).queryKey,
				renewedLease
			)
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
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
		mutationFn: (id: string) =>
			apiRequest(`/api/v1/leases/${id}`, {
				method: 'DELETE'
			}),
		onSuccess: (_result, deletedId) => {
			// Remove from cache
			queryClient.removeQueries({
				queryKey: leaseQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
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
// ============================================================================

/**
 * Hook to fetch signature status for a lease
 */
export function useLeaseSignatureStatus(leaseId: string) {
	return useQuery(leaseQueries.signatureStatus(leaseId))
}

/**
 * Hook to send a lease for signature (owner action)
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
			apiRequest<{ success: boolean }>(
				`/api/v1/leases/${leaseId}/send-for-signature`,
				{
					method: 'POST',
					body: JSON.stringify({ message, missingFields })
				}
			),
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
 */
export function useSignLeaseAsOwnerMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.sign,
		mutationFn: (leaseId: string) =>
			apiRequest<{ success: boolean }>(`/api/v1/leases/${leaseId}/sign/owner`, {
				method: 'POST'
			}),
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
 */
export function useSignLeaseAsTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.sign,
		mutationFn: (leaseId: string) =>
			apiRequest<{ success: boolean }>(
				`/api/v1/leases/${leaseId}/sign/tenant`,
				{
					method: 'POST'
				}
			),
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
 * Cancel a pending signature request - reverts lease to draft status
 */
export function useCancelSignatureRequestMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.cancelSignature,
		mutationFn: (leaseId: string) =>
			apiRequest<{ success: boolean }>(
				`/api/v1/leases/${leaseId}/cancel-signature`,
				{
					method: 'POST'
				}
			),
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
 * Resend signature request - cancels existing and creates fresh submission
 */
export function useResendSignatureRequestMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.resendSignature,
		mutationFn: ({ leaseId, message }: { leaseId: string; message?: string }) =>
			apiRequest<{ success: boolean }>(
				`/api/v1/leases/${leaseId}/resend-signature`,
				{
					method: 'POST',
					body: JSON.stringify({ message })
				}
			),
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
 * Hook to get signed document URL for download
 */
export function useSignedDocumentUrl(leaseId: string, enabled = true) {
	return useQuery({
		queryKey: ['lease', leaseId, 'signed-document'],
		queryFn: () =>
			apiRequest<{ document_url: string | null }>(
				`/api/v1/leases/${leaseId}/signed-document`
			),
		enabled: enabled && !!leaseId,
		staleTime: 5 * 60 * 1000 // 5 minutes
	})
}
