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
<<<<<<< HEAD
import { leaseApi } from '@/lib/api/leases'
import type { LeaseStats } from '@repo/shared'
import { queryKeys } from '@/lib/react-query/query-keys'
=======
import { leaseApi, leaseKeys, type LeaseStats } from '@/lib/api/leases'
>>>>>>> origin/main
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
<<<<<<< HEAD
): UseQueryResult<Lease[]> {
	return useQuery({
		queryKey: queryKeys.leases.list(query),
		queryFn: async () => leaseApi.getAll(query),
=======
): UseQueryResult<Lease[], Error> {
	return useQuery({
		queryKey: leaseKeys.list(query),
		queryFn: () => leaseApi.getAll(query),
>>>>>>> origin/main
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
<<<<<<< HEAD
): UseQueryResult<Lease> {
	return useQuery({
		queryKey: queryKeys.leases.detail(id),
		queryFn: async () => leaseApi.getById(id),
=======
): UseQueryResult<Lease, Error> {
	return useQuery({
		queryKey: leaseKeys.detail(id),
		queryFn: () => leaseApi.getById(id),
>>>>>>> origin/main
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
<<<<<<< HEAD
): UseQueryResult<Lease[]> {
	return useQuery({
		queryKey: queryKeys.leases.byProperty(propertyId),
		queryFn: async () => leaseApi.getByProperty(propertyId),
=======
): UseQueryResult<Lease[], Error> {
	return useQuery({
		queryKey: leaseKeys.byProperty(propertyId),
		queryFn: () => leaseApi.getByProperty(propertyId),
>>>>>>> origin/main
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
<<<<<<< HEAD
): UseQueryResult<Lease[]> {
	return useQuery({
		queryKey: queryKeys.leases.byTenant(tenantId),
		queryFn: async () => leaseApi.getByTenant(tenantId),
=======
): UseQueryResult<Lease[], Error> {
	return useQuery({
		queryKey: leaseKeys.byTenant(tenantId),
		queryFn: () => leaseApi.getByTenant(tenantId),
>>>>>>> origin/main
		enabled: Boolean(tenantId) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch lease statistics
 */
<<<<<<< HEAD
export function useLeaseStats(): UseQueryResult<LeaseStats> {
	return useQuery({
		queryKey: queryKeys.leases.stats(),
=======
export function useLeaseStats(): UseQueryResult<LeaseStats, Error> {
	return useQuery({
		queryKey: leaseKeys.stats(),
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
			await queryClient.cancelQueries({ queryKey: leaseKeys.lists() })

			// Snapshot the previous value
			const previousLeases = queryClient.getQueryData(leaseKeys.lists())

			// Optimistically update all lease lists
			queryClient.setQueriesData(
				{ queryKey: leaseKeys.lists() },
				(old: Lease[] | undefined) => {
					if (!old) return []
>>>>>>> origin/main
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
<<<<<<< HEAD
					{ queryKey: queryKeys.leases.lists() },
=======
					{ queryKey: leaseKeys.lists() },
>>>>>>> origin/main
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
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: leaseKeys.lists() })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
		mutationFn: ({ id, data }) => leaseApi.update(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this lease
			await queryClient.cancelQueries({ queryKey: leaseKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: leaseKeys.lists() })

			// Snapshot the previous values
			const previousLease = queryClient.getQueryData(leaseKeys.detail(id))
			const previousList = queryClient.getQueryData(leaseKeys.lists())

			// Optimistically update lease detail
			queryClient.setQueryData(
				leaseKeys.detail(id),
>>>>>>> origin/main
				(old: Lease | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update lease in lists
			queryClient.setQueriesData(
<<<<<<< HEAD
				{ queryKey: queryKeys.leases.lists() },
=======
				{ queryKey: leaseKeys.lists() },
>>>>>>> origin/main
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
<<<<<<< HEAD
					queryKeys.leases.detail(id),
=======
					leaseKeys.detail(id),
>>>>>>> origin/main
					context.previousLease
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
<<<<<<< HEAD
					{ queryKey: queryKeys.leases.lists() },
=======
					{ queryKey: leaseKeys.lists() },
>>>>>>> origin/main
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
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: leaseKeys.detail(id) })
			queryClient.invalidateQueries({ queryKey: leaseKeys.lists() })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
			await queryClient.cancelQueries({ queryKey: leaseKeys.lists() })

			// Snapshot previous list
			const previousList = queryClient.getQueryData(leaseKeys.lists())

			// Optimistically remove lease from lists
			queryClient.setQueriesData(
				{ queryKey: leaseKeys.lists() },
>>>>>>> origin/main
				(old: Lease[] | undefined) =>
					old?.filter(lease => lease.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
<<<<<<< HEAD
					{ queryKey: queryKeys.leases.lists() },
=======
					{ queryKey: leaseKeys.lists() },
>>>>>>> origin/main
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
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: leaseKeys.lists() })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
>>>>>>> origin/main
		}
	})
}

<<<<<<< HEAD
// Note: useGenerateLeasePDF is now available in use-pdf.ts for consistency with other PDF operations
=======
/**
 * Generate lease PDF
 */
export function useGenerateLeasePDF(): UseMutationResult<
	{ url: string },
	Error,
	string
> {
	return useMutation({
		mutationFn: leaseApi.generatePDF,
		onSuccess: data => {
			// Trigger download
			if (data.url) {
				try {
					const link = document.createElement('a')
					link.href = data.url
					link.download = 'lease.pdf'
					link.target = '_blank'
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)

					toast.success('Lease PDF generated successfully')
				} catch (error) {
					console.error('Download failed:', error)
					window.open(data.url, '_blank')
				}
			}
		},
		onError: () => {
			toast.error('Failed to generate lease PDF')
		}
	})
}
>>>>>>> origin/main

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
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: leaseKeys.lists() })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
>>>>>>> origin/main
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
<<<<<<< HEAD
		mutationFn: async ({ id, reason }) =>
			leaseApi.terminate(id, { reason }),
=======
		mutationFn: ({ id, reason }) => leaseApi.terminate(id, { reason }),
>>>>>>> origin/main
		onSuccess: () => {
			toast.success('Lease terminated successfully')
		},
		onError: () => {
			toast.error('Failed to terminate lease')
		},
		onSettled: () => {
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: leaseKeys.lists() })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
>>>>>>> origin/main
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
<<<<<<< HEAD
		mutationFn: async ({ id, endDate, newRent }) =>
=======
		mutationFn: ({ id, endDate, newRent }) =>
>>>>>>> origin/main
			leaseApi.renew(id, { endDate, newRent }),
		onSuccess: () => {
			toast.success('Lease renewed successfully')
		},
		onError: () => {
			toast.error('Failed to renew lease')
		},
		onSettled: () => {
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.leases.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: leaseKeys.lists() })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
>>>>>>> origin/main
		}
	})
}
