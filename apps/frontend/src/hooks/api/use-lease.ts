/**
 * Lease Hooks
 * TanStack Query hooks for lease management with complete CRUD operations
 * React 19 + TanStack Query v5 patterns with Suspense support

 * Expanded from read-only to full CRUD following use-tenant.ts pattern:
 * - Complete CRUD mutations (create, update, delete, renew, terminate)
 * - Optimistic updates with rollback
 * - Proper error handling
 */

import { clientFetch } from '#lib/api/client'
import { logger } from '@repo/shared/lib/frontend-logger'
import { useMemo } from 'react'
import type {
	CreateLeaseInput,
	UpdateLeaseInput
} from '@repo/shared/types/api-contracts'
import type { Lease, LeaseWithVersion } from '@repo/shared/types/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleConflictError,
	isConflictError,
	withVersion,
	incrementVersion
} from '@repo/shared/utils/optimistic-locking'
import { handleMutationError } from '#lib/mutation-error-handler'
import { leaseQueries } from './queries/lease-queries'
import { maintenanceQueries } from './queries/maintenance-queries'

// Re-export query factory
export { leaseQueries } from './queries/lease-queries'

/**
 * Hook to fetch lease by ID
 */
export function useLease(id: string) {
	return useQuery(leaseQueries.detail(id))
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
 *
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
	const expiringQuery = leaseQueries.expiring(daysUntilExpiry)
	return useQuery({ ...expiringQuery, ...QUERY_CACHE_TIMES.DETAIL, retry: 2 })
}

/**
 * Hook to fetch lease statistics
 */
export function useLeaseStats() {
	return useQuery(leaseQueries.stats())
}

/**
 * Mutation hook to create a new lease with optimistic updates
 */
export function useCreateLease() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (leaseData: CreateLeaseInput) =>
			clientFetch<Lease>('/api/v1/leases', {
				method: 'POST',
				body: JSON.stringify(leaseData)
			}),
		onMutate: async (newLease) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: leaseQueries.lists() })

			// Snapshot previous state
			const previousLists = queryClient.getQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>({
				queryKey: leaseQueries.lists()
			})

			// Create optimistic lease entry
			const tempId = `temp-${Date.now()}`
			const optimisticLease: Lease = {
				id: tempId,
				primary_tenant_id: newLease.primary_tenant_id ?? null,
			unit_id: newLease.unit_id ?? null,
			property_owner_id: newLease.property_owner_id ?? null,
			start_date: newLease.start_date,
				end_date: newLease.end_date,
				rent_amount: newLease.rent_amount,
				security_deposit: newLease.security_deposit ?? null,
				lease_status: 'ACTIVE',
				auto_pay_enabled: null,
				grace_period_days: null,
				late_fee_amount: null,
				late_fee_days: null,
				stripe_subscription_id: null,
				payment_day: newLease.payment_day ?? 1,
				rent_currency: newLease.rent_currency ?? 'USD',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			// Optimistically update all caches
			queryClient.setQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>(
				{ queryKey: leaseQueries.lists() },
				old => {
					const data = old?.data ?? []
					return {
						...old,
						data: [optimisticLease, ...data],
						total: (old?.total ?? data.length) + 1
					}
				}
			)

			return { previousLists, tempId }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to create lease', {
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: (data, _variables, context) => {
			// Replace optimistic entry with real data
			queryClient.setQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>(
				{ queryKey: leaseQueries.lists() },
				old => {
					if (!old) return { data: [data], total: 1 }
					return {
						...old,
						data: old.data.map(lease =>
							lease.id === context?.tempId ? data : lease
						)
					}
				}
			)

			// Cache individual lease details
			queryClient.setQueryData(leaseQueries.detail(data.id).queryKey, data)

			logger.info('Lease created successfully', { lease_id: data.id })
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.stats().queryKey })
		}
	})
}

/**
 * Mutation hook to update an existing lease with optimistic updates
 */
export function useUpdateLease() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			data,
			version
		}: {
			id: string
			data: UpdateLeaseInput
			version?: number
		}): Promise<Lease> => {
			return clientFetch<Lease>(`/api/v1/leases/${id}`, {
				method: 'PUT',
				// OPTIMISTIC LOCKING: Include version if provided
				body: JSON.stringify(
					version !== null && version !== undefined
						? withVersion(data, version)
						: data
				)
			})
		},
		onMutate: async ({ id, data }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: leaseQueries.detail(id).queryKey })
			await queryClient.cancelQueries({ queryKey: leaseQueries.lists() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Lease>(
				leaseQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>(
				{ queryKey: leaseQueries.lists() }
			)

			// Optimistically update detail cache (use incrementVersion helper)
		queryClient.setQueryData<LeaseWithVersion>(leaseQueries.detail(id).queryKey, old =>
			old ? (incrementVersion(old, data)) : undefined
		)

			// Optimistically update list caches
		queryClient.setQueriesData<{ data: LeaseWithVersion[]; total?: number; limit?: number; offset?: number }>(
			{ queryKey: leaseQueries.lists() },
			old => {
				if (!old) return old
				return {
					...old,
					data: old.data.map(lease =>
						lease.id === id ? (incrementVersion(lease, data)) : lease
					)
				}
			}
		)

			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
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

			// Handle 409 Conflict using helper
			if (isConflictError(err)) {
				handleConflictError('leases', id, queryClient, [
					leaseQueries.detail(id).queryKey,
					leaseQueries.lists()
				])
			} else {
				handleMutationError(err, 'Update lease')
			}
		},
		onSuccess: (data, { id }) => {
			// Replace optimistic update with real data (including correct version)
			queryClient.setQueryData(leaseQueries.detail(id).queryKey, data)

			queryClient.setQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>(
				{ queryKey: leaseQueries.lists() },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(lease => (lease.id === id ? data : lease))
					}
				}
			)

			logger.info('Lease updated successfully', { lease_id: id })
		},
		onSettled: (_data, _error, { id }) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: leaseQueries.detail(id).queryKey })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.stats().queryKey })
		}
	})
}

/**
 * Mutation hook to delete a lease with optimistic removal
 */
export function useDeleteLease(options?: {
	onSuccess?: () => void
	onError?: (error: Error) => void
}) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string): Promise<string> => {
			await clientFetch(`/api/v1/leases/${id}`, {
				method: 'DELETE'
			})
			return id
		},
		onMutate: async (id: string) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: leaseQueries.detail(id).queryKey })
			await queryClient.cancelQueries({ queryKey: leaseQueries.lists() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Lease>(
				leaseQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>(
				{ queryKey: leaseQueries.lists() }
			)

			// Optimistically remove from all caches
			queryClient.removeQueries({ queryKey: leaseQueries.detail(id).queryKey })
			queryClient.setQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>(
				{ queryKey: leaseQueries.lists() },
				old =>
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
 * Mutation hook to renew a lease
 */
export function useRenewLease() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, newEndDate }: { id: string; newEndDate: string }) =>
			clientFetch<Lease>(`/api/v1/leases/${id}/renew`, {
				method: 'POST',
				body: JSON.stringify({ end_date: newEndDate })
			}),
		onSuccess: (data, { id }) => {
			// Update caches with renewed lease
			queryClient.setQueryData(leaseQueries.detail(id).queryKey, data)

			queryClient.setQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>(
				{ queryKey: leaseQueries.lists() },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(lease => (lease.id === id ? data : lease))
					}
				}
			)

			logger.info('Lease renewed successfully', { lease_id: id })
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.stats().queryKey })
			queryClient.invalidateQueries({ queryKey: leaseQueries.expiring().queryKey })
		}
	})
}

/**
 * Mutation hook to terminate a lease early
 */
export function useTerminateLease() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			id,
			terminationDate,
			reason
		}: {
			id: string
			terminationDate: string
			reason?: string
		}) =>
			clientFetch<Lease>(`/api/v1/leases/${id}/terminate`, {
				method: 'POST',
				body: JSON.stringify(
					reason !== undefined
						? { terminationDate, reason }
						: { terminationDate }
				)
			}),
		onSuccess: (data, { id }) => {
			// Update caches with terminated lease
			queryClient.setQueryData(leaseQueries.detail(id).queryKey, data)

			queryClient.setQueriesData<{ data: Lease[]; total?: number; limit?: number; offset?: number }>(
				{ queryKey: leaseQueries.lists() },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(lease => (lease.id === id ? data : lease))
					}
				}
			)

			logger.info('Lease terminated successfully', { lease_id: id })
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.stats().queryKey })
		}
	})
}

/**
 * Hook for prefetching lease details (for hover states)
 */
export function usePrefetchLease() {
	const queryClient = useQueryClient()

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: leaseQueries.detail(id).queryKey,
			queryFn: () => clientFetch<Lease>(`/api/v1/leases/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
		})
	}
}

/**
 * Combined hook for all lease operations
 * Convenience hook for components that need multiple operations
 */
export function useLeaseOperations() {
	const create = useCreateLease()
	const update = useUpdateLease()
	const remove = useDeleteLease()
	const renew = useRenewLease()
	const terminate = useTerminateLease()

	return useMemo(
		() => ({
			create,
			update,
			delete: remove,
			renew,
			terminate,
			isLoading:
				create.isPending ||
				update.isPending ||
				remove.isPending ||
				renew.isPending ||
				terminate.isPending
		}),
		[create, update, remove, renew, terminate]
	)
}
