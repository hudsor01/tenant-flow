/**
 * Tenant Hooks
 * TanStack Query hooks for tenant management - Single Source of Truth
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * TanStack Query provides:
 * - Normalized cache (query keys)
 * - Global state (accessible anywhere)
 * - Automatic deduplication
 * - Loading/error states
 * - Optimistic updates
 */

import { API_BASE_URL } from '#lib/api-config'
import { logger } from '@repo/shared/lib/frontend-logger'
import { toast } from 'sonner' // Still needed for some success handlers
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'
import type {
	Tenant,
	TenantInput,
	TenantUpdate,
	TenantWithLeaseInfo
} from '@repo/shared/types/core'
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery
} from '@tanstack/react-query'


/**
 * Query keys for tenant endpoints
 */
export const tenantKeys = {
	all: ['tenants'] as const,
	list: () => [...tenantKeys.all, 'list'] as const,
	detail: (id: string) => [...tenantKeys.all, 'detail', id] as const,
	withLease: (id: string) => [...tenantKeys.all, 'with-lease', id] as const,
	stats: () => [...tenantKeys.all, 'stats'] as const
}

/**
 * Hook to fetch tenant by ID
 * TanStack Query cache is the single source of truth
 */
export function useTenant(id: string) {
	return useQuery({
		queryKey: tenantKeys.detail(id),
		queryFn: async (): Promise<Tenant> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch tenant')
			}
			return res.json()
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes cache time
	})
}

/**
 * Hook to fetch tenant with lease information
 * TanStack Query cache is the single source of truth
 */
export function useTenantWithLease(id: string) {
	return useQuery({
		queryKey: tenantKeys.withLease(id),
		queryFn: async (): Promise<TenantWithLeaseInfo> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}/with-lease`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch tenant with lease')
			}
			return res.json()
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes cache time
		retry: 2
	})
}

/**
 * Hook to fetch tenant list with pagination
 * TanStack Query cache is the single source of truth
 */
export function useTenantList(page: number = 1, limit: number = 50) {
	const queryClient = useQueryClient()

	// Convert page to offset (backend expects offset, not page)
	const offset = (page - 1) * limit

	return useQuery({
		queryKey: [...tenantKeys.list(), { page, limit }],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants?limit=${limit}&offset=${offset}`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch tenants')
			}

			// Backend returns Tenant[] directly, not paginated object
			const response = await res.json() as TenantWithLeaseInfo[]

			// Prefetch individual tenant details for faster navigation
			response?.forEach?.(tenant => {
				queryClient.setQueryData(tenantKeys.detail(tenant.id), tenant)
				queryClient.setQueryData(tenantKeys.withLease(tenant.id), tenant)
			})

			// Transform to expected paginated format for backwards compatibility
			return {
				data: response || [],
				total: response?.length || 0,
				page,
				limit
			}
		},
		staleTime: 3 * 60 * 1000, // 3 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes cache time
		retry: 2,
		// Keep previous data while fetching new page (official v5 helper)
		placeholderData: keepPreviousData
	})
}

/**
 * Hook to fetch all tenants (for dropdowns, selects, etc.)
 * TanStack Query cache is the single source of truth
 */
export function useAllTenants() {
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: tenantKeys.list(),
		queryFn: async (): Promise<TenantWithLeaseInfo[]> => {
			try {
				const res = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
					credentials: 'include'
				})
				if (!res.ok) {
					throw new Error('Failed to fetch tenants')
				}
				const response = await res.json() as TenantWithLeaseInfo[]

				// Prefetch individual tenant details for instant navigation
				response.forEach(tenant => {
					queryClient.setQueryData(tenantKeys.detail(tenant.id), tenant)
					queryClient.setQueryData(tenantKeys.withLease(tenant.id), tenant)
				})

				return response
			} catch (error) {
				logger.error(
					'Failed to fetch tenant list',
					{ action: 'useAllTenants' },
					error
				)
				throw error
			}
		},
		staleTime: 10 * 60 * 1000, // 10 minutes - list data rarely changes
		gcTime: 30 * 60 * 1000, // 30 minutes cache time for dropdown data
		retry: 3, // Retry up to 3 times
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s (max 30s)
		// Enable structural sharing to prevent re-renders when data hasn't changed
		structuralSharing: true
	})
}

/**
 * Mutation hook to create a new tenant
 * No optimistic updates - waits for server response
 */
export function useCreateTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (tenantData: TenantInput): Promise<Tenant> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(tenantData)
			})
			if (!res.ok) {
				throw new Error('Failed to create tenant')
			}
			return res.json()
		},
		onError: (err) => handleMutationError(err, 'Create tenant'),
		onSuccess: (data) => {
			// Cache individual tenant details
			queryClient.setQueryData(tenantKeys.detail(data.id), data)
			queryClient.setQueryData(tenantKeys.withLease(data.id), data)

			// Invalidate list to refetch with new tenant
			queryClient.invalidateQueries({ queryKey: tenantKeys.list() })
		}
	})
}

/**
 * Mutation hook to update an existing tenant with enhanced optimistic updates
 * Includes comprehensive rollback mechanism for both detail and list caches
 */
export function useUpdateTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: TenantUpdate }): Promise<TenantWithLeaseInfo> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(data)
			})
			if (!res.ok) {
				throw new Error('Failed to update tenant')
			}
			return res.json()
		},
		onMutate: async ({ id, data }) => {
			// Cancel all outgoing queries for this tenant
			await queryClient.cancelQueries({ queryKey: tenantKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: tenantKeys.withLease(id) })
			await queryClient.cancelQueries({ queryKey: tenantKeys.list() })

			// Snapshot all relevant caches for comprehensive rollback
			const previousDetail = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id)
			)
			const previousWithLease = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantKeys.withLease(id)
			)
			const previousList = queryClient.getQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list()
			)

			// Optimistically update detail cache
			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id),
				old => {
					if (!old) return old
					return {
						...old,
						...data,
						name:
							data.firstName && data.lastName
								? `${data.firstName} ${data.lastName}`.trim()
								: old.name,
						updatedAt: new Date().toISOString()
					} as TenantWithLeaseInfo
				}
			)

			// Optimistically update with-lease cache
			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantKeys.withLease(id),
				old => {
					if (!old) return old
					return {
						...old,
						...data,
						name:
							data.firstName && data.lastName
								? `${data.firstName} ${data.lastName}`.trim()
								: old.name,
						updatedAt: new Date().toISOString()
					} as TenantWithLeaseInfo
				}
			)

			// Optimistically update list cache
			queryClient.setQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list(),
				old => {
					if (!old) return old
					return old.map(tenant =>
						tenant.id === id
							? ({
									...tenant,
									...data,
									name:
										data.firstName && data.lastName
											? `${data.firstName} ${data.lastName}`.trim()
											: tenant.name,
									updatedAt: new Date().toISOString()
								} as TenantWithLeaseInfo)
							: tenant
					)
				}
			)

			return { previousDetail, previousWithLease, previousList, id }
		},
		onError: (err, _variables, context) => {
			// Comprehensive rollback: restore all caches
			if (context) {
				if (context.previousDetail) {
					queryClient.setQueryData(
						tenantKeys.detail(context.id),
						context.previousDetail
					)
				}
				if (context.previousWithLease) {
					queryClient.setQueryData(
						tenantKeys.withLease(context.id),
						context.previousWithLease
					)
				}
				if (context.previousList) {
					queryClient.setQueryData(tenantKeys.list(), context.previousList)
				}
			}

			handleMutationError(err, 'Update tenant')
		},

		onSuccess: data => {
			// Merge server response into all caches
			queryClient.setQueryData(tenantKeys.detail(data.id), data)
			queryClient.setQueryData(tenantKeys.withLease(data.id), data)
			queryClient.setQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list(),
				old => {
					if (!old) return [data]
					return old.map(tenant => (tenant.id === data.id ? data : tenant))
				}
			)
		}
	})
}

/**
 * Combined hook for tenant operations needed by tenant management pages
 * Note: DELETE operations now use React 19 useOptimistic with Server Actions
 */
export function useTenantOperations() {
	const createTenant = useCreateTenant()
	const updateTenant = useUpdateTenant()

	return {
		createTenant,
		updateTenant,
		isLoading: createTenant.isPending || updateTenant.isPending,
		error: createTenant.error || updateTenant.error
	}
}

/**
 * React 19 Suspense-enabled hook for tenant fetching
 * Use this with Suspense boundaries for automatic loading states
 * Automatically throws errors to nearest Error Boundary
 */
export function useTenantSuspense(id: string) {
	return useSuspenseQuery({
		queryKey: tenantKeys.detail(id),
		queryFn: async (): Promise<Tenant> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch tenant')
			}
			return res.json()
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}

/**
 * React 19 Suspense-enabled hook for tenant with lease information
 * Use this with Suspense boundaries for automatic loading states
 */
export function useTenantWithLeaseSuspense(id: string) {
	return useSuspenseQuery({
		queryKey: tenantKeys.withLease(id),
		queryFn: async (): Promise<TenantWithLeaseInfo> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}/with-lease`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch tenant with lease')
			}
			return res.json()
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}

/**
 * React 19 Suspense-enabled hook for all tenants list
 * Use this with Suspense boundaries for automatic loading states
 */
export function useAllTenantsSuspense() {
	const queryClient = useQueryClient()

	return useSuspenseQuery({
		queryKey: tenantKeys.list(),
		queryFn: async (): Promise<TenantWithLeaseInfo[]> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch tenants')
			}
			const response = await res.json() as TenantWithLeaseInfo[]

			// Prefetch individual tenant details for instant navigation
			response.forEach(tenant => {
				queryClient.setQueryData(tenantKeys.detail(tenant.id), tenant)
				queryClient.setQueryData(tenantKeys.withLease(tenant.id), tenant)
			})

			return response
		},
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000
	})
}

/**
 * Hook for polling tenant data with configurable interval
 * Useful for real-time tenant status updates
 */
export function useTenantPolling(id: string, interval: number = 30000) {
	return useQuery({
		queryKey: [...tenantKeys.detail(id), 'polling'],
		queryFn: async (): Promise<Tenant> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch tenant')
			}
			return res.json()
		},
		enabled: !!id,
		refetchInterval: interval,
		refetchIntervalInBackground: false,
		staleTime: 0 // Always refetch on interval
	})
}

/**
 * Hook for prefetching tenant data before navigation
 * Call this on hover or before route changes
 */
export function usePrefetchTenant() {
	const queryClient = useQueryClient()

	return {
		prefetchTenant: (id: string) => {
			return queryClient.prefetchQuery({
				queryKey: tenantKeys.detail(id),
				queryFn: async (): Promise<Tenant> => {
					const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}`, {
						credentials: 'include'
					})
					if (!res.ok) {
						throw new Error('Failed to fetch tenant')
					}
					return res.json()
				},
				staleTime: 5 * 60 * 1000
			})
		},
		prefetchTenantWithLease: (id: string) => {
			return queryClient.prefetchQuery({
				queryKey: tenantKeys.withLease(id),
				queryFn: async (): Promise<TenantWithLeaseInfo> => {
					const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}/with-lease`, {
						credentials: 'include'
					})
					if (!res.ok) {
						throw new Error('Failed to fetch tenant with lease')
					}
					return res.json()
				},
				staleTime: 5 * 60 * 1000
			})
		}
	}
}

/**
 * Hook for optimistic tenant updates with automatic rollback
 * Enhanced with proper TypeScript types and error handling
 */
export function useOptimisticTenantUpdate() {
	const queryClient = useQueryClient()

	return {
		updateOptimistically: async (
			id: string,
			updates: Partial<TenantWithLeaseInfo>
		) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: tenantKeys.detail(id) })

			// Snapshot previous value
			const previous = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id)
			)

			// Optimistically update
			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id),
				old => {
					if (!old) return old
					return { ...old, ...updates }
				}
			)

			return {
				previous,
				rollback: () => {
					if (previous) {
						queryClient.setQueryData(tenantKeys.detail(id), previous)
					}
				}
			}
		}
	}
}

/**
 * Mutation hook to mark tenant as moved out (soft delete)
 * Includes optimistic updates with automatic rollback
 * Follows industry-standard 7-year retention pattern
 */
export function useMarkTenantAsMovedOut() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: { moveOutDate: string; moveOutReason: string } }): Promise<TenantWithLeaseInfo> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}/mark-moved-out`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(data)
			})
			if (!res.ok) {
				throw new Error('Failed to mark tenant as moved out')
			}
			return res.json()
		},
		onMutate: async ({ id, data }) => {
			// Cancel in-flight queries
			await queryClient.cancelQueries({ queryKey: tenantKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: tenantKeys.withLease(id) })
			await queryClient.cancelQueries({ queryKey: tenantKeys.list() })

			// Snapshot previous values
			const previousDetail = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id)
			)
			const previousWithLease = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantKeys.withLease(id)
			)
			const previousList = queryClient.getQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list()
			)

			// Optimistic update - mark as MOVED_OUT in detail caches
			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id),
				old => {
					if (!old) return old
					return {
						...old,
						status: 'MOVED_OUT',
						move_out_date: data.moveOutDate,
						move_out_reason: data.moveOutReason,
						updatedAt: new Date().toISOString()
					} as TenantWithLeaseInfo
				}
			)

			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantKeys.withLease(id),
				old => {
					if (!old) return old
					return {
						...old,
						status: 'MOVED_OUT',
						move_out_date: data.moveOutDate,
						move_out_reason: data.moveOutReason,
						updatedAt: new Date().toISOString()
					} as TenantWithLeaseInfo
				}
			)

			// Optimistic update - remove from list (soft delete)
			queryClient.setQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list(),
				old => {
					if (!old) return old
					return old.filter(tenant => tenant.id !== id)
				}
			)

			return { previousDetail, previousWithLease, previousList, id }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context) {
				if (context.previousDetail) {
					queryClient.setQueryData(
						tenantKeys.detail(context.id),
						context.previousDetail
					)
				}
				if (context.previousWithLease) {
					queryClient.setQueryData(
						tenantKeys.withLease(context.id),
						context.previousWithLease
					)
				}
				if (context.previousList) {
					queryClient.setQueryData(tenantKeys.list(), context.previousList)
				}
			}

			handleMutationError(err, 'Mark tenant as moved out')
		},
		onSuccess: (data) => {
			handleMutationSuccess('Mark tenant as moved out', `${data.name} has been marked as moved out`)
		},
		onSettled: (_data, _error, variables) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({
				queryKey: tenantKeys.detail(variables.id)
			})
			queryClient.invalidateQueries({
				queryKey: tenantKeys.withLease(variables.id)
			})
			queryClient.invalidateQueries({ queryKey: tenantKeys.list() })
		}
	})
}

/**
 * Hook for batch tenant operations
 * Useful for bulk updates/deletes with progress tracking
 */
export function useBatchTenantOperations() {
	const queryClient = useQueryClient()

	return {
		batchUpdate: async (updates: Array<{ id: string; data: TenantUpdate }>) => {
			const results = await Promise.allSettled(
				updates.map(async ({ id, data }) => {
					const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json'
						},
						credentials: 'include',
						body: JSON.stringify(data)
					})
					if (!res.ok) {
						throw new Error('Failed to update tenant')
					}
					return res.json() as Promise<TenantWithLeaseInfo>
				})
			)

			// Invalidate all affected queries
			await queryClient.invalidateQueries({ queryKey: tenantKeys.list() })
			updates.forEach(({ id }) => {
				queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) })
			})

			return results
		},
		batchDelete: async (ids: string[]) => {
			const results = await Promise.allSettled(
				ids.map(async (id) => {
					const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${id}`, {
						method: 'DELETE',
						credentials: 'include'
					})
					if (!res.ok) {
						throw new Error('Failed to delete tenant')
					}
					return res.json()
				})
			)

			// Invalidate all affected queries
			await queryClient.invalidateQueries({ queryKey: tenantKeys.list() })

			return results
		}
	}
}

/**
 * Invite tenant - Creates tenant record and sends invitation email
 * Backend automatically sends invitation after tenant creation
 */
export function useInviteTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: {
			email: string
			firstName: string
			lastName: string
			phone: string | null
			leaseId: string
		}): Promise<Tenant> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					email: data.email,
					firstName: data.firstName,
					lastName: data.lastName,
					phone: data.phone,
					name: `${data.firstName} ${data.lastName}`,
					status: 'PENDING' // Will be updated when invitation is accepted
				})
			})
			if (!res.ok) {
				throw new Error('Failed to create tenant')
			}
			const response = await res.json() as Tenant

			// Associate tenant with lease
			if (data.leaseId) {
				const leaseRes = await fetch(`${API_BASE_URL}/api/v1/leases/${data.leaseId}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({ tenantId: response.id })
				})
				if (!leaseRes.ok) {
					throw new Error('Failed to associate tenant with lease')
				}
			}

			return response
		},
		onSuccess: (data) => {
			toast.success('Invitation sent', {
				description: `${data.name} will receive an email to accept the invitation`
			})

			// Invalidate tenant list to show new pending tenant
			queryClient.invalidateQueries({ queryKey: tenantKeys.list() })

			logger.info('Tenant invitation sent', {
				action: 'invite_tenant',
				metadata: { tenantId: data.id, email: data.email }
			})
		},
		onError: (error) => {
			handleMutationError(error, 'Send tenant invitation')
		}
	})
}

/**
 * Resend invitation email for expired or pending invitations
 */
export function useResendInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (tenantId: string): Promise<{ message: string }> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/resend-invitation`, {
				method: 'POST',
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to resend invitation')
			}
			return res.json()
		},
		onSuccess: (_, tenantId) => {
			toast.success('Invitation resent', {
				description: 'A new invitation email has been sent'
			})

			// Refresh tenant data to show updated invitation_sent_at
			queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) })
			queryClient.invalidateQueries({ queryKey: tenantKeys.list() })

			logger.info('Tenant invitation resent', {
				action: 'resend_invitation',
				metadata: { tenantId }
			})
		},
		onError: (error) => {
			handleMutationError(error, 'Resend invitation')
		}
	})
}
