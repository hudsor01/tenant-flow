/**
 * Lease Hooks
 * TanStack Query hooks for lease management with complete CRUD operations
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Expanded from read-only to full CRUD following use-tenant.ts pattern:
 * - Complete CRUD mutations (create, update, delete, renew, terminate)
 * - Optimistic updates with rollback
 * - Proper error handling
 */

import { logger } from '@repo/shared/lib/frontend-logger'
import type {
	CreateLeaseInput,
	UpdateLeaseInput
} from '@repo/shared/types/api-inputs'
import type { Lease } from '@repo/shared/types/core'
import { apiClient } from '@repo/shared/utils/api-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query keys for lease endpoints (hierarchical, typed)
 */
export const leaseKeys = {
	all: ['leases'] as const,
	list: (params?: { status?: string; search?: string }) =>
		[...leaseKeys.all, 'list', params] as const,
	detail: (id: string) => [...leaseKeys.all, 'detail', id] as const,
	expiring: () => [...leaseKeys.all, 'expiring'] as const,
	stats: () => [...leaseKeys.all, 'stats'] as const,
	analytics: {
		performance: () => [...leaseKeys.all, 'analytics', 'performance'] as const,
		duration: () => [...leaseKeys.all, 'analytics', 'duration'] as const,
		turnover: () => [...leaseKeys.all, 'analytics', 'turnover'] as const,
		revenue: () => [...leaseKeys.all, 'analytics', 'revenue'] as const
	}
}

/**
 * Hook to fetch lease by ID with optimized caching
 */
export function useLease(id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: leaseKeys.detail(id),
		queryFn: async (): Promise<Lease> => {
			const response = await apiClient<Lease>(
				`${API_BASE_URL}/api/v1/leases/${id}`
			)
			return response
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2,
		// Use data from list query as placeholder
		placeholderData: () => {
			const cachedLists = queryClient.getQueriesData<{
				data: Lease[]
				total: number
			}>({
				queryKey: leaseKeys.all
			})

			for (const [, data] of cachedLists) {
				const lease = data?.data?.find((l: Lease) => l.id === id)
				if (lease) return lease
			}
			return undefined
		}
	})
}

/**
 * Hook to fetch user's current active lease
 */
export function useCurrentLease() {
	return useQuery({
		queryKey: leaseKeys.list({ status: 'ACTIVE' }),
		queryFn: async (): Promise<Lease | null> => {
			const response = await apiClient<{
				data: Lease[]
				total: number
				limit: number
				offset: number
			}>(`${API_BASE_URL}/api/v1/leases?status=ACTIVE&limit=1`)
			return response.data?.[0] || null
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2
	})
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

	return useQuery({
		queryKey: leaseKeys.list(
			status || search
				? { ...(status && { status }), ...(search && { search }) }
				: undefined
		),
		queryFn: async () => {
			const searchParams = new URLSearchParams()
			if (status) searchParams.append('status', status)
			if (search) searchParams.append('search', search)
			searchParams.append('limit', limit.toString())
			searchParams.append('offset', offset.toString())

			const response = await apiClient<{
				data: Lease[]
				total: number
				limit: number
				offset: number
			}>(`${API_BASE_URL}/api/v1/leases?${searchParams.toString()}`)

			// Prefetch individual lease details
			response.data.forEach(lease => {
				queryClient.setQueryData(leaseKeys.detail(lease.id), lease)
			})

			return response
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		retry: 2,
		structuralSharing: true
	})
}

/**
 * Hook to fetch expiring leases
 */
export function useExpiringLeases(daysUntilExpiry: number = 30) {
	return useQuery({
		queryKey: [...leaseKeys.expiring(), { days: daysUntilExpiry }],
		queryFn: async (): Promise<Lease[]> => {
			const response = await apiClient<Lease[]>(
				`${API_BASE_URL}/api/v1/leases/expiring?days=${daysUntilExpiry}`
			)
			return response
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2
	})
}

/**
 * Hook to fetch lease statistics
 */
export function useLeaseStats() {
	return useQuery({
		queryKey: leaseKeys.stats(),
		queryFn: async () => {
			const response = await apiClient(`${API_BASE_URL}/api/v1/leases/stats`)
			return response
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}

/**
 * Mutation hook to create a new lease with optimistic updates
 */
export function useCreateLease() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (leaseData: CreateLeaseInput) => {
			const response = await apiClient<Lease>(`${API_BASE_URL}/api/v1/leases`, {
				method: 'POST',
				body: JSON.stringify(leaseData)
			})
			return response
		},
		onMutate: async (newLease: CreateLeaseInput) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: leaseKeys.all })

			// Snapshot previous state
			const previousLists = queryClient.getQueriesData<{
				data: Lease[]
				total: number
			}>({
				queryKey: leaseKeys.all
			})

			// Create optimistic lease entry
			const tempId = `temp-${Date.now()}`
			const optimisticLease: Lease = {
				id: tempId,
				tenantId: newLease.tenantId,
				unitId: newLease.unitId,
				propertyId: newLease.propertyId || null,
				startDate: newLease.startDate,
				endDate: newLease.endDate,
				rentAmount: newLease.rentAmount,
				securityDeposit: newLease.securityDeposit,
				monthlyRent: newLease.monthlyRent || null,
				status: newLease.status || 'ACTIVE',
				terms: newLease.terms || null,
				gracePeriodDays: newLease.gracePeriodDays || null,
				lateFeeAmount: newLease.lateFeeAmount || null,
				lateFeePercentage: newLease.lateFeePercentage || null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			// Optimistically update all caches
			queryClient.setQueriesData<{ data: Lease[]; total: number }>(
				{ queryKey: leaseKeys.all },
				old =>
					old
						? {
								...old,
								data: [optimisticLease, ...old.data],
								total: old.total + 1
							}
						: { data: [optimisticLease], total: 1 }
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
			queryClient.setQueriesData<{ data: Lease[]; total: number }>(
				{ queryKey: leaseKeys.all },
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
			queryClient.setQueryData(leaseKeys.detail(data.id), data)

			logger.info('Lease created successfully', { leaseId: data.id })
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: leaseKeys.all })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
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
			data
		}: {
			id: string
			data: UpdateLeaseInput
		}) => {
			const response = await apiClient<Lease>(
				`${API_BASE_URL}/api/v1/leases/${id}`,
				{
					method: 'PUT',
					body: JSON.stringify(data)
				}
			)
			return response
		},
		onMutate: async ({ id, data }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: leaseKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: leaseKeys.all })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Lease>(
				leaseKeys.detail(id)
			)
			const previousLists = queryClient.getQueriesData<{
				data: Lease[]
				total: number
			}>({
				queryKey: leaseKeys.all
			})

			// Optimistically update detail cache
			queryClient.setQueryData<Lease>(leaseKeys.detail(id), old =>
				old
					? { ...old, ...data, updatedAt: new Date().toISOString() }
					: undefined
			)

			// Optimistically update list caches
			queryClient.setQueriesData<{ data: Lease[]; total: number }>(
				{ queryKey: leaseKeys.all },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(lease =>
							lease.id === id
								? { ...lease, ...data, updatedAt: new Date().toISOString() }
								: lease
						)
					}
				}
			)

			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(leaseKeys.detail(id), context.previousDetail)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to update lease', {
				leaseId: id,
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: (data, { id }) => {
			// Replace optimistic update with real data
			queryClient.setQueryData(leaseKeys.detail(id), data)

			queryClient.setQueriesData<{ data: Lease[]; total: number }>(
				{ queryKey: leaseKeys.all },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(lease => (lease.id === id ? data : lease))
					}
				}
			)

			logger.info('Lease updated successfully', { leaseId: id })
		},
		onSettled: (_data, _error, { id }) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: leaseKeys.detail(id) })
			queryClient.invalidateQueries({ queryKey: leaseKeys.all })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
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
		mutationFn: async (id: string) => {
			await apiClient(`${API_BASE_URL}/api/v1/leases/${id}`, {
				method: 'DELETE'
			})
			return id
		},
		onMutate: async (id: string) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: leaseKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: leaseKeys.all })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Lease>(
				leaseKeys.detail(id)
			)
			const previousLists = queryClient.getQueriesData<{
				data: Lease[]
				total: number
			}>({
				queryKey: leaseKeys.all
			})

			// Optimistically remove from all caches
			queryClient.removeQueries({ queryKey: leaseKeys.detail(id) })
			queryClient.setQueriesData<{ data: Lease[]; total: number }>(
				{ queryKey: leaseKeys.all },
				old =>
					old
						? {
								...old,
								data: old.data.filter(lease => lease.id !== id),
								total: old.total - 1
							}
						: old
			)

			return { previousDetail, previousLists }
		},
		onError: (err, id, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(leaseKeys.detail(id), context.previousDetail)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to delete lease', {
				leaseId: id,
				error: err instanceof Error ? err.message : String(err)
			})

			options?.onError?.(err instanceof Error ? err : new Error(String(err)))
		},
		onSuccess: id => {
			logger.info('Lease deleted successfully', { leaseId: id })
			options?.onSuccess?.()
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: leaseKeys.all })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
		}
	})
}

/**
 * Mutation hook to renew a lease
 */
export function useRenewLease() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			newEndDate
		}: {
			id: string
			newEndDate: string
		}) => {
			const response = await apiClient<Lease>(
				`${API_BASE_URL}/api/v1/leases/${id}/renew`,
				{
					method: 'POST',
					body: JSON.stringify({ endDate: newEndDate })
				}
			)
			return response
		},
		onSuccess: (data, { id }) => {
			// Update caches with renewed lease
			queryClient.setQueryData(leaseKeys.detail(id), data)

			queryClient.setQueriesData<{ data: Lease[]; total: number }>(
				{ queryKey: leaseKeys.all },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(lease => (lease.id === id ? data : lease))
					}
				}
			)

			logger.info('Lease renewed successfully', { leaseId: id })
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: leaseKeys.all })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
			queryClient.invalidateQueries({ queryKey: leaseKeys.expiring() })
		}
	})
}

/**
 * Mutation hook to terminate a lease early
 */
export function useTerminateLease() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			terminationDate,
			reason
		}: {
			id: string
			terminationDate: string
			reason?: string
		}) => {
			const response = await apiClient<Lease>(
				`${API_BASE_URL}/api/v1/leases/${id}/terminate`,
				{
					method: 'POST',
					body: JSON.stringify({ terminationDate, reason })
				}
			)
			return response
		},
		onSuccess: (data, { id }) => {
			// Update caches with terminated lease
			queryClient.setQueryData(leaseKeys.detail(id), data)

			queryClient.setQueriesData<{ data: Lease[]; total: number }>(
				{ queryKey: leaseKeys.all },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(lease => (lease.id === id ? data : lease))
					}
				}
			)

			logger.info('Lease terminated successfully', { leaseId: id })
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: leaseKeys.all })
			queryClient.invalidateQueries({ queryKey: leaseKeys.stats() })
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
			queryKey: leaseKeys.detail(id),
			queryFn: async (): Promise<Lease> => {
				const response = await apiClient<Lease>(
					`${API_BASE_URL}/api/v1/leases/${id}`
				)
				return response
			},
			staleTime: 5 * 60 * 1000
		})
	}
}

/**
 * Combined hook for all lease operations
 * Convenience hook for components that need multiple operations
 */
export function useLeaseOperations() {
	return {
		create: useCreateLease(),
		update: useUpdateLease(),
		delete: useDeleteLease(),
		renew: useRenewLease(),
		terminate: useTerminateLease()
	}
}
