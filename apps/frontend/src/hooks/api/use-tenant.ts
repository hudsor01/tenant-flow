/**
 * Tenant Hooks & Query Options
 * TanStack Query hooks for tenant management with colocated query options
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Query keys are in a separate file to avoid circular dependencies.
 * - Query hooks for data fetching
 * - Mutation hooks for data modification
 * - Utility hooks for prefetching and optimistic updates
 */

import {
	keepPreviousData,
	useMutation,
	usePrefetchQuery,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { toast } from 'sonner'
import { logger } from '@repo/shared/lib/frontend-logger'
import { incrementVersion } from '@repo/shared/utils/optimistic-locking'
import type {
	TenantCreate,
	TenantUpdate
} from '@repo/shared/validation/tenants'
import type {
	Tenant,
	TenantWithLeaseInfo,
	TenantWithExtras,
	TenantWithLeaseInfoWithVersion
} from '@repo/shared/types/core'

// Import query keys from separate file to avoid circular dependency
import { tenantQueries } from './query-keys/tenant-keys'
import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Invitation filters
 */
export interface InvitationFilters {
	status?: 'sent' | 'accepted' | 'expired'
	page?: number
	limit?: number
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch tenant by ID
 * Uses placeholderData from list cache for instant detail view
 */
export function useTenant(id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		...tenantQueries.detail(id),
		placeholderData: () => {
			// Search all list caches for this tenant
			const listCaches = queryClient.getQueriesData<{
				data?: TenantWithLeaseInfo[]
			}>({
				queryKey: tenantQueries.lists()
			})

			for (const [, response] of listCaches) {
				const item = response?.data?.find(t => t.id === id)
				if (item) return item
			}
			return undefined
		}
	})
}

/**
 * Hook to fetch tenant with lease information
 */
export function useTenantWithLease(id: string) {
	return useQuery(tenantQueries.withLease(id))
}

/**
 * Hook to fetch tenant list with pagination
 */
export function useTenantList(page: number = 1, limit: number = 50) {
	const queryClient = useQueryClient()
	const offset = (page - 1) * limit
	const queryOpts = tenantQueries.list({ limit, offset })

	return useQuery({
		...queryOpts,
		select: response => {
			response.data?.forEach?.(tenant => {
				const detailKey = tenantQueries.detail(tenant.id).queryKey
				const leaseKey = tenantQueries.withLease(tenant.id).queryKey

				// TenantWithLeaseInfo extends Tenant, so this is type-safe
				if (!queryClient.getQueryData(detailKey)) {
					queryClient.setQueryData(detailKey, tenant)
				}
				if (!queryClient.getQueryData(leaseKey)) {
					queryClient.setQueryData(leaseKey, tenant)
				}
			})

			return {
				data: response.data || [],
				total: response.total || 0,
				page,
				limit
			}
		},
		placeholderData: keepPreviousData
	})
}

/**
 * Hook to fetch all tenants (for dropdowns, selects, etc.)
 */
export function useAllTenants() {
	const queryClient = useQueryClient()

	return useQuery({
		...tenantQueries.allTenants(),
		select: response => {
			response.forEach(tenant => {
				const existingDetail = queryClient.getQueryData(
					tenantQueries.detail(tenant.id).queryKey
				)
				const existingWithLease = queryClient.getQueryData(
					tenantQueries.withLease(tenant.id).queryKey
				)

				// TenantWithLeaseInfo extends Tenant, so this is type-safe
				if (!existingDetail) {
					queryClient.setQueryData(
						tenantQueries.detail(tenant.id).queryKey,
						tenant
					)
				}
				if (!existingWithLease) {
					queryClient.setQueryData(
						tenantQueries.withLease(tenant.id).queryKey,
						tenant
					)
				}
			})

			return response
		}
	})
}

/**
 * Hook to fetch tenant statistics
 */
export function useTenantStats() {
	return useQuery(tenantQueries.stats())
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Declarative prefetch hook for tenant detail
 * Prefetches when component mounts (route-level prefetching)
 *
 * For imperative prefetching (e.g., on hover), use:
 * queryClient.prefetchQuery(tenantQueries.detail(id))
 */
export function usePrefetchTenantDetail(id: string) {
	usePrefetchQuery(tenantQueries.detail(id))
}

/**
 * Declarative prefetch hook for tenant with lease info
 * Prefetches tenant detail with associated lease data
 */
export function usePrefetchTenantWithLease(id: string) {
	usePrefetchQuery(tenantQueries.withLease(id))
}

/**
 * Hook for optimistic tenant updates with automatic rollback
 */
export function useOptimisticTenantUpdate() {
	const queryClient = useQueryClient()

	return {
		updateOptimistically: async (
			id: string,
			updates: Partial<TenantWithLeaseInfo>
		) => {
			await queryClient.cancelQueries({
				queryKey: tenantQueries.detail(id).queryKey
			})

			const previous = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantQueries.detail(id).queryKey
			)

			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantQueries.detail(id).queryKey,
				old => {
					if (!old) return old
					return { ...old, ...updates }
				}
			)

			return {
				previous,
				rollback: () => {
					if (previous) {
						queryClient.setQueryData(
							tenantQueries.detail(id).queryKey,
							previous
						)
					}
				}
			}
		}
	}
}

/**
 * Hook to fetch notification preferences for a tenant
 */
export function useNotificationPreferences(tenant_id: string) {
	return useQuery(tenantQueries.notificationPreferences(tenant_id))
}

/**
 * Hook to fetch tenant invitations list
 */
export function useInvitations() {
	return useQuery(tenantQueries.invitationList())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create tenant mutation
 */
export function useCreateTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.create,
		mutationFn: (data: TenantCreate) =>
			apiRequest<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			toast.success('Tenant created successfully')
		},
		onError: error => {
			handleMutationError(error, 'Create tenant')
		}
	})
}

/**
 * Update tenant mutation
 */
export function useUpdateTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.update,
		mutationFn: ({ id, data }: { id: string; data: TenantUpdate }) =>
			apiRequest<Tenant>(`/api/v1/tenants/${id}`, {
				method: 'PUT',
				body: JSON.stringify(data)
			}),
		onSuccess: updatedTenant => {
			queryClient.setQueryData(
				tenantQueries.detail(updatedTenant.id).queryKey,
				updatedTenant
			)
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			toast.success('Tenant updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update tenant')
		}
	})
}

/**
 * Delete tenant mutation
 */
export function useDeleteTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.delete,
		mutationFn: async (id: string) =>
			apiRequest<void>(`/api/v1/tenants/${id}`, { method: 'DELETE' }),
		onSuccess: (_result, deletedId) => {
			queryClient.removeQueries({
				queryKey: tenantQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			toast.success('Tenant deleted successfully')
		},
		onError: error => {
			handleMutationError(error, 'Delete tenant')
		}
	})
}

/**
 * Mark tenant as moved out (soft delete)
 * Follows industry-standard 7-year retention pattern
 */
export function useMarkTenantAsMovedOutMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.markMovedOut,
		mutationFn: async ({
			id,
			data
		}: {
			id: string
			data: { moveOutDate: string; moveOutReason: string }
		}): Promise<TenantWithLeaseInfo> => {
			return apiRequest<TenantWithLeaseInfo>(
				`/api/v1/tenants/${id}/mark-moved-out`,
				{
					method: 'PUT',
					body: JSON.stringify(data)
				}
			)
		},
		onMutate: async ({ id }) => {
			await queryClient.cancelQueries({
				queryKey: tenantQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({
				queryKey: tenantQueries.withLease(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: tenantQueries.lists() })

			const previousDetail = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantQueries.detail(id).queryKey
			)
			const previousWithLease = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantQueries.withLease(id).queryKey
			)
			const previousList = queryClient.getQueryData<TenantWithLeaseInfo[]>(
				tenantQueries.lists()
			)

			queryClient.setQueryData<TenantWithLeaseInfoWithVersion>(
				tenantQueries.detail(id).queryKey,
				(old: TenantWithLeaseInfoWithVersion | undefined) => {
					if (!old) return old
					return incrementVersion(old, {
						updated_at: new Date().toISOString()
					} as Partial<TenantWithLeaseInfoWithVersion>) as TenantWithLeaseInfoWithVersion
				}
			)

			queryClient.setQueryData<TenantWithLeaseInfoWithVersion>(
				tenantQueries.withLease(id).queryKey,
				(old: TenantWithLeaseInfoWithVersion | undefined) => {
					if (!old) return old
					return incrementVersion(old, {
						updated_at: new Date().toISOString()
					} as Partial<TenantWithLeaseInfoWithVersion>) as TenantWithLeaseInfoWithVersion
				}
			)

			queryClient.setQueryData<TenantWithLeaseInfo[]>(
				tenantQueries.lists(),
				old => {
					if (!old) return old
					return old.filter(tenant => tenant.id !== id)
				}
			)

			return { previousDetail, previousWithLease, previousList, id }
		},
		onError: (err, _variables, context) => {
			if (context) {
				if (context.previousDetail) {
					queryClient.setQueryData(
						tenantQueries.detail(context.id).queryKey,
						context.previousDetail as unknown as Tenant
					)
				}
				if (context.previousWithLease) {
					queryClient.setQueryData(
						tenantQueries.withLease(context.id).queryKey,
						context.previousWithLease
					)
				}
				if (context.previousList) {
					queryClient.setQueryData(tenantQueries.lists(), context.previousList)
				}
			}
			handleMutationError(err, 'Mark tenant as moved out')
		},
		onSuccess: data => {
			handleMutationSuccess(
				'Mark tenant as moved out',
				`${data?.name ?? 'Tenant'} has been marked as moved out`
			)
		},
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({
				queryKey: tenantQueries.detail(variables.id).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: tenantQueries.withLease(variables.id).queryKey
			})
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
		}
	})
}

/**
 * Batch tenant operations using bulk endpoints
 */
export function useBatchTenantOperations() {
	const queryClient = useQueryClient()

	return {
		batchUpdate: async (updates: Array<{ id: string; data: TenantUpdate }>) => {
			const response = await apiRequest<{
				success: Array<{ id: string; tenant: TenantWithLeaseInfo }>
				failed: Array<{ id: string; error: string }>
			}>('/api/v1/tenants/bulk-update', {
				method: 'POST',
				body: JSON.stringify({ updates })
			})

			if (response.failed.length > 0) {
				response.failed.forEach(failure => {
					toast.error(`Failed to update tenant: ${failure.error}`)
				})
			}

			if (response.success.length > 0) {
				toast.success(`Updated ${response.success.length} tenant(s)`)
			}

			await queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			updates.forEach(({ id }) => {
				queryClient.invalidateQueries({
					queryKey: tenantQueries.detail(id).queryKey
				})
			})

			return response
		},
		batchDelete: async (ids: string[]) => {
			const response = await apiRequest<{
				success: Array<{ id: string }>
				failed: Array<{ id: string; error: string }>
			}>('/api/v1/tenants/bulk-delete', {
				method: 'DELETE',
				body: JSON.stringify({ ids })
			})

			if (response.failed.length > 0) {
				response.failed.forEach(failure => {
					toast.error(`Failed to delete tenant: ${failure.error}`)
				})
			}

			if (response.success.length > 0) {
				toast.success(`Deleted ${response.success.length} tenant(s)`)
			}

			await queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })

			return response
		}
	}
}

/**
 * Invite tenant - Creates tenant record and sends invitation email
 */
export function useInviteTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.invite,
		mutationFn: async (data: {
			email: string
			first_name: string
			last_name: string
			phone: string | null
			lease_id: string
		}): Promise<TenantWithExtras> => {
			const response = await apiRequest<TenantWithExtras>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					email: data?.email ?? '',
					name: `${data.first_name} ${data.last_name}`.trim(),
					phone: data.phone ?? null
				})
			})

			if (data.lease_id) {
				await apiRequest(`/api/v1/leases/${data.lease_id}`, {
					method: 'PATCH',
					body: JSON.stringify({ tenant_id: response.id })
				})
			}

			return response
		},
		onSuccess: data => {
			toast.success('Invitation sent', {
				description: `${data?.name ?? 'Tenant'} will receive an email to accept the invitation`
			})

			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })

			logger.info('Tenant invitation sent', {
				action: 'invite_tenant',
				metadata: { tenant_id: data?.id, email: data?.email ?? '' }
			})
		},
		onError: error => {
			handleMutationError(error, 'Send tenant invitation')
		}
	})
}

/**
 * Resend invitation email for expired or pending invitations
 */
export function useResendInvitationMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.resendInvite,
		mutationFn: (tenant_id: string) =>
			apiRequest<{ message: string }>(
				`/api/v1/tenants/${tenant_id}/resend-invitation`,
				{
					method: 'POST'
				}
			),
		onSuccess: (_, tenant_id) => {
			toast.success('Invitation resent', {
				description: 'A new invitation email has been sent'
			})

			queryClient.invalidateQueries({
				queryKey: tenantQueries.detail(tenant_id).queryKey
			})
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })

			logger.info('Tenant invitation resent', {
				action: 'resend_invitation',
				metadata: { tenant_id }
			})
		},
		onError: error => {
			handleMutationError(error, 'Resend invitation')
		}
	})
}

/**
 * Cancel tenant invitation
 */
export function useCancelInvitationMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.cancelInvite,
		mutationFn: (invitationId: string) =>
			apiRequest<{ message: string }>(
				`/api/v1/tenants/invitations/${invitationId}/cancel`,
				{
					method: 'POST'
				}
			),
		onSuccess: () => {
			toast.success('Invitation cancelled')

			queryClient.invalidateQueries({ queryKey: tenantQueries.invitations() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })

			logger.info('Tenant invitation cancelled', {
				action: 'cancel_invitation'
			})
		},
		onError: error => {
			handleMutationError(error, 'Cancel invitation')
		}
	})
}

/**
 * Update notification preferences for a tenant
 */
export function useUpdateNotificationPreferencesMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.updateNotificationPreferences,
		mutationFn: ({
			tenant_id,
			preferences
		}: {
			tenant_id: string
			preferences: {
				emailNotifications: boolean
				smsNotifications: boolean
				maintenanceUpdates: boolean
				paymentReminders: boolean
			}
		}) =>
			apiRequest(`/api/v1/tenants/${tenant_id}/notification-preferences`, {
				method: 'PUT',
				body: JSON.stringify(preferences)
			}),
		onSuccess: (_data, variables) => {
			toast.success('Notification preferences updated')

			queryClient.invalidateQueries({
				queryKey: [
					...tenantQueries.detail(variables.tenant_id).queryKey,
					'notification-preferences'
				]
			})

			logger.info('Notification preferences updated', {
				action: 'update_notification_preferences',
				metadata: { tenant_id: variables.tenant_id }
			})
		},
		onError: error => {
			handleMutationError(error, 'Update notification preferences')
		}
	})
}
