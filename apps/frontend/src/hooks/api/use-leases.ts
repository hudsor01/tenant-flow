/**
 * React Query hooks for Leases
 * Native TanStack Query implementation - no custom abstractions
 */
import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { leaseApi } from '@/lib/api/leases'
import type { LeaseStats } from '@repo/shared'
import { queryKeys } from '@/lib/react-query/query-keys'
import type {
	Lease,
	LeaseQuery,
	CreateLeaseInput,
	UpdateLeaseInput
} from '@repo/shared'

/**
 * Fetch list of leases with optional filters
 */
export function useLeases(
	query?: LeaseQuery,
	options?: { enabled?: boolean }
): UseQueryResult<Lease[]> {
	return useQuery({
		queryKey: queryKeys.leases.list(query),
		queryFn: async () => leaseApi.getAll(query),
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Fetch single lease by ID
 */
export function useLease(
	id: string,
	options?: { enabled?: boolean }
): UseQueryResult<Lease> {
	return useQuery({
		queryKey: queryKeys.leases.detail(id),
		queryFn: async () => leaseApi.getById(id),
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch leases by property ID
 */
export function useLeasesByProperty(
	propertyId: string,
	options?: { enabled?: boolean }
): UseQueryResult<Lease[]> {
	return useQuery({
		queryKey: queryKeys.leases.byProperty(propertyId),
		queryFn: async () => leaseApi.getByProperty(propertyId),
		enabled: Boolean(propertyId) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch leases by tenant ID
 */
export function useLeasesByTenant(
	tenantId: string,
	options?: { enabled?: boolean }
): UseQueryResult<Lease[]> {
	return useQuery({
		queryKey: queryKeys.leases.byTenant(tenantId),
		queryFn: async () => leaseApi.getByTenant(tenantId),
		enabled: Boolean(tenantId) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch lease statistics
 */
export function useLeaseStats(): UseQueryResult<LeaseStats> {
	return useQuery({
		queryKey: queryKeys.leases.stats(),
		queryFn: leaseApi.getStats,
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

/**
 * Create new lease with optimistic updates
 */
export function useCreateLease(): UseMutationResult<
	Lease,
	Error,
	CreateLeaseInput
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: leaseApi.create,
		onMutate: async newLease => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.leases.lists()
			})

			// Snapshot the previous value
			const previousLeases = queryClient.getQueryData(
				queryKeys.leases.lists()
			)

			// Optimistically update all lease lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.leases.lists() },
				(old: Lease[] | undefined) => {
					if (!old) {
						return []
					}
					return [
						...old,
						{
							...newLease,
							id: `temp-${Date.now()}`,
							createdAt: new Date(),
							updatedAt: new Date()
						} as Lease
					]
				}
			)

			return { previousLeases }
		},
		onError: (err, newLease, context) => {
			// Revert optimistic update on error
			if (context?.previousLeases) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.leases.lists() },
					context.previousLeases
				)
			}
			toast.error('Failed to create lease')
		},
		onSuccess: () => {
			toast.success('Lease created successfully')
		},
		onSettled: () => {
			// Always refetch after error or success
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
		}
	})
}

/**
 * Update lease with optimistic updates
 */
export function useUpdateLease(): UseMutationResult<
	Lease,
	Error,
	{ id: string; data: UpdateLeaseInput }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data }) => leaseApi.update(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this lease
			await queryClient.cancelQueries({
				queryKey: queryKeys.leases.detail(id)
			})
			await queryClient.cancelQueries({
				queryKey: queryKeys.leases.lists()
			})

			// Snapshot the previous values
			const previousLease = queryClient.getQueryData(
				queryKeys.leases.detail(id)
			)
			const previousList = queryClient.getQueryData(
				queryKeys.leases.lists()
			)

			// Optimistically update lease detail
			queryClient.setQueryData(
				queryKeys.leases.detail(id),
				(old: Lease | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update lease in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.leases.lists() },
				(old: Lease[] | undefined) =>
					old?.map(lease =>
						lease.id === id
							? { ...lease, ...data, updatedAt: new Date() }
							: lease
					)
			)

			return { previousLease, previousList }
		},
		onError: (err, { id }, context) => {
			// Revert optimistic updates on error
			if (context?.previousLease) {
				queryClient.setQueryData(
					queryKeys.leases.detail(id),
					context.previousLease
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.leases.lists() },
					context.previousList
				)
			}
			toast.error('Failed to update lease')
		},
		onSuccess: () => {
			toast.success('Lease updated successfully')
		},
		onSettled: (data, err, { id }) => {
			// Refetch to ensure consistency
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
		}
	})
}

/**
 * Delete lease with optimistic updates
 */
export function useDeleteLease(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: leaseApi.delete,
		onMutate: async id => {
			// Cancel queries
			await queryClient.cancelQueries({
				queryKey: queryKeys.leases.lists()
			})

			// Snapshot previous list
			const previousList = queryClient.getQueryData(
				queryKeys.leases.lists()
			)

			// Optimistically remove lease from lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.leases.lists() },
				(old: Lease[] | undefined) =>
					old?.filter(lease => lease.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.leases.lists() },
					context.previousList
				)
			}
			toast.error('Failed to delete lease')
		},
		onSuccess: () => {
			toast.success('Lease deleted successfully')
		},
		onSettled: () => {
			// Refetch to ensure consistency
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
		}
	})
}

// Note: useGenerateLeasePDF is now available in use-pdf.ts for consistency with other PDF operations

/**
 * Activate lease
 */
export function useActivateLease(): UseMutationResult<Lease, Error, string> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: leaseApi.activate,
		onSuccess: () => {
			toast.success('Lease activated successfully')
		},
		onError: () => {
			toast.error('Failed to activate lease')
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
		}
	})
}

/**
 * Terminate lease
 */
export function useTerminateLease(): UseMutationResult<
	Lease,
	Error,
	{ id: string; reason: string }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, reason }) =>
			leaseApi.terminate(id, { reason }),
		onSuccess: () => {
			toast.success('Lease terminated successfully')
		},
		onError: () => {
			toast.error('Failed to terminate lease')
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
		}
	})
}

/**
 * Renew lease
 */
export function useRenewLease(): UseMutationResult<
	Lease,
	Error,
	{ id: string; endDate: string; newRent?: number }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, endDate, newRent }) =>
			leaseApi.renew(id, { endDate, newRent }),
		onSuccess: () => {
			toast.success('Lease renewed successfully')
		},
		onError: () => {
			toast.error('Failed to renew lease')
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
		}
	})
}
