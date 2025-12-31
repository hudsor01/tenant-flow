/**
 * Tenant Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and cache invalidation.
 * Uses apiRequest for NestJS calls.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
	TenantInput,
	TenantWithLeaseInfo,
	TenantWithExtras,
	TenantWithLeaseInfoWithVersion
} from '@repo/shared/types/core'
import { tenantQueries } from '../queries/tenant-queries'
import { leaseQueries } from '../queries/lease-queries'
import { createCrudMutations } from '../crud-mutations'

const {
	useCreateMutation: useCreateTenantMutationBase,
	useUpdateMutation: useUpdateTenantMutationBase
} = createCrudMutations<TenantCreate, TenantUpdate, Tenant>({
	entityName: 'Tenant',
	createEndpoint: '/api/v1/tenants',
	updateEndpoint: id => `/api/v1/tenants/${id}`,
	deleteEndpoint: id => `/api/v1/tenants/${id}`,
	listQueryKey: tenantQueries.lists,
	detailQueryKey: id => tenantQueries.detail(id).queryKey
})

/**
 * Create tenant mutation (CRUD factory version)
 */
export const useCreateTenantMutation = useCreateTenantMutationBase

/**
 * Update tenant mutation (CRUD factory version)
 */
export function useUpdateTenantMutation() {
	const mutation = useUpdateTenantMutationBase()

	return {
		...mutation,
		mutate: ({ id, data }: { id: string; data: TenantUpdate }) =>
			mutation.mutate({
				id,
				data
			})
	}
}

/**
 * Delete tenant mutation
 */
export function useDeleteTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
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
 * Create tenant mutation with optimistic updates
 * Alternative to CRUD factory version with manual implementation
 */
export function useCreateTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (tenantData: TenantInput) =>
			apiRequest<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify(tenantData)
			}),
		onError: err => handleMutationError(err, 'Create tenant'),
		onSuccess: data => {
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({
				queryKey: tenantQueries.detail(data.id).queryKey
			})
		}
	})
}

/**
 * Update tenant mutation with comprehensive optimistic updates
 * Includes rollback mechanism for detail and list caches
 */
export function useUpdateTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: TenantUpdate }) =>
			apiRequest<TenantWithLeaseInfo>(`/api/v1/tenants/${id}`, {
				method: 'PUT',
				body: JSON.stringify(data)
			}),
		onMutate: async ({ id, data }) => {
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
						...data,
						updated_at: new Date().toISOString()
					} as Partial<TenantWithLeaseInfoWithVersion>)
				}
			)

			queryClient.setQueryData<TenantWithLeaseInfoWithVersion>(
				tenantQueries.withLease(id).queryKey,
				(old: TenantWithLeaseInfoWithVersion | undefined) => {
					if (!old) return old
					return incrementVersion(old, {
						...data,
						updated_at: new Date().toISOString()
					} as Partial<TenantWithLeaseInfoWithVersion>)
				}
			)

			queryClient.setQueryData<TenantWithLeaseInfoWithVersion[]>(
				tenantQueries.lists(),
				(old: TenantWithLeaseInfoWithVersion[] | undefined) => {
					if (!old) return old
					return old.map(tenant =>
						tenant.id === id
							? incrementVersion(tenant, {
									...data,
									updated_at: new Date().toISOString()
								} as Partial<TenantWithLeaseInfoWithVersion>)
							: tenant
					)
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
			handleMutationError(err, 'Update tenant')
		},
		onSuccess: data => {
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({
				queryKey: tenantQueries.detail(data.id).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: tenantQueries.withLease(data.id).queryKey
			})
		}
	})
}

/**
 * Mark tenant as moved out (soft delete)
 * Follows industry-standard 7-year retention pattern
 */
export function useMarkTenantAsMovedOut() {
	const queryClient = useQueryClient()

	return useMutation({
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
export function useInviteTenant() {
	const queryClient = useQueryClient()

	return useMutation({
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
export function useResendInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
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
export function useCancelInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
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
export function useUpdateNotificationPreferences() {
	const queryClient = useQueryClient()

	return useMutation({
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
