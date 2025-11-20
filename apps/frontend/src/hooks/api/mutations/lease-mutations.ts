/**
 * Lease Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import type { CreateLeaseInput, UpdateLeaseInput } from '@repo/shared/types/api-contracts'
import type { Lease } from '@repo/shared/types/core'
import { leaseQueries } from '../queries/lease-queries'
import { tenantQueries } from '../queries/tenant-queries'
import { unitQueries } from '../queries/unit-queries'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

/**
 * Create lease mutation
 */
export function useCreateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateLeaseInput) =>
			clientFetch<Lease>('/api/v1/leases', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: (_newLease) => {
			// Invalidate lease, tenant, and unit lists
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			toast.success('Lease created successfully')
		},
		onError: (error) => {
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
		mutationFn: ({ id, data, version }: { id: string; data: UpdateLeaseInput; version?: number }) =>
			clientFetch<Lease>(`/api/v1/leases/${id}`, {
				method: 'PUT',
				body: JSON.stringify(version ? { ...data, version } : data)
			}),
		onSuccess: (updatedLease) => {
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
		onError: (error) => {
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
		mutationFn: (id: string) =>
			clientFetch<Lease>(`/api/v1/leases/${id}/terminate`, {
				method: 'POST'
			}),
		onSuccess: (_terminatedLease) => {
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			toast.success('Lease terminated successfully')
		},
		onError: (error) => {
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
		mutationFn: ({ id, data }: { id: string; data: { end_date: string } }) =>
			clientFetch<Lease>(`/api/v1/leases/${id}/renew`, {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: (renewedLease) => {
			queryClient.setQueryData(
				leaseQueries.detail(renewedLease.id).queryKey,
				renewedLease
			)
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			toast.success('Lease renewed successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Renew lease')
		}
	})
}

/**
 * Delete lease mutation
 */
export function useDeleteLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			clientFetch(`/api/v1/leases/${id}`, {
				method: 'DELETE'
			}),
		onSuccess: (_result, deletedId) => {
			// Remove from cache
			queryClient.removeQueries({ queryKey: leaseQueries.detail(deletedId).queryKey })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			toast.success('Lease deleted successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete lease')
		}
	})
}