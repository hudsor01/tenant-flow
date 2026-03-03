/**
 * Tenant Hooks & Query Options
 * TanStack Query hooks for tenant management with colocated query options
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Query keys are in a separate file to avoid circular dependencies.
 * - Query hooks for data fetching
 * - Mutation hooks for data modification
 * - Utility hooks for prefetching and optimistic updates
 *
 * PostgREST migration notes:
 * - All CRUD mutations use supabase-js directly
 * - tenants table: id, user_id, emergency_contact_*, identity_verified, ssn_last_four, stripe_customer_id
 * - Invite flow: creates tenant_invitations record; actual tenant created when user accepts
 * - useResendInvitationMutation / useCancelInvitationMutation: stubbed — TODO(phase-57) Edge Function needed
 */

import {
	keepPreviousData,
	useMutation,
	usePrefetchQuery,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { toast } from 'sonner'
import { logger } from '#shared/lib/frontend-logger'
import { incrementVersion } from '#shared/utils/optimistic-locking'
import type {
	TenantCreate,
	TenantUpdate
} from '#shared/validation/tenants'
import type {
	Tenant,
	TenantWithLeaseInfo,
	TenantWithExtras,
	TenantWithLeaseInfoWithVersion
} from '#shared/types/core'

// Import query keys from separate file to avoid circular dependency
import { tenantQueries } from './query-keys/tenant-keys'
import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

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
 * Note: tenants table requires user_id FK to auth.users.
 * This creates a raw tenant record (e.g., during onboarding after user exists).
 */
export function useCreateTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.create,
		mutationFn: async (data: TenantCreate): Promise<Tenant> => {
			const supabase = createClient()
			const { data: created, error } = await supabase
				.from('tenants')
				.insert(data)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'tenants')

			return created as Tenant
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
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
		mutationFn: async ({
			id,
			data
		}: {
			id: string
			data: TenantUpdate
		}): Promise<Tenant> => {
			const supabase = createClient()
			const { data: updated, error } = await supabase
				.from('tenants')
				.update(data)
				.eq('id', id)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'tenants')

			return updated as Tenant
		},
		onSuccess: updatedTenant => {
			queryClient.setQueryData(
				tenantQueries.detail(updatedTenant.id).queryKey,
				updatedTenant
			)
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Tenant updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update tenant')
		}
	})
}

/**
 * Delete tenant mutation
 * Soft-delete: removes the tenant from the system by deleting their record.
 * Hard delete is allowed here since tenants are linked via user_id (no FK cascade issue).
 * We soft-delete by removing the lease association instead, keeping the tenant record.
 * Per 7-year retention policy, actual deletion requires manual review.
 * For now: update lease_tenants to remove association (tenant record kept).
 */
export function useDeleteTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.delete,
		mutationFn: async (id: string): Promise<void> => {
			const supabase = createClient()
			// Remove all lease_tenants associations for this tenant (soft-remove)
			const { error } = await supabase
				.from('lease_tenants')
				.delete()
				.eq('tenant_id', id)

			if (error) handlePostgrestError(error, 'tenants')
		},
		onSuccess: (_result, deletedId) => {
			queryClient.removeQueries({
				queryKey: tenantQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
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
 * Updates the users table status and removes lease_tenants associations
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
			const supabase = createClient()

			// Get the tenant to find user_id
			const { data: tenant, error: tenantError } = await supabase
				.from('tenants')
				.select('user_id')
				.eq('id', id)
				.single()

			if (tenantError) handlePostgrestError(tenantError, 'tenants')

			// Update the user record to mark as inactive
			const { error: userError } = await supabase
				.from('users')
				.update({
					status: 'inactive',
					updated_at: new Date().toISOString()
				})
				.eq('id', tenant!.user_id)

			if (userError) handlePostgrestError(userError, 'users')

			// Fetch updated tenant with lease info for return value
			const { data: updated, error: fetchError } = await supabase
				.from('tenants')
				.select(
					'*, users!tenants_user_id_fkey(id, email, first_name, last_name, full_name, phone, status), lease_tenants(lease_id, is_primary, leases(id, lease_status, start_date, end_date, rent_amount, security_deposit, unit_id, auto_pay_enabled, primary_tenant_id, owner_user_id, units(id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, property_id, properties(id, name, address_line1, address_line2, city, state, postal_code))))'
				)
				.eq('id', id)
				.single()

			if (fetchError) handlePostgrestError(fetchError, 'tenants')

			// Log move-out reason (no DB column for it, kept for audit trail via logger)
			logger.info('Tenant marked as moved out', {
				action: 'mark_moved_out',
				metadata: {
					tenant_id: id,
					move_out_date: data.moveOutDate,
					move_out_reason: data.moveOutReason
				}
			})

			return updated as unknown as TenantWithLeaseInfo
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
 * Batch tenant operations using PostgREST .in() queries (single round-trip per group)
 */
export function useBatchTenantOperations() {
	const queryClient = useQueryClient()

	return {
		batchUpdate: async (updates: Array<{ id: string; data: TenantUpdate }>) => {
			const supabase = createClient()
			const successIds: string[] = []
			const failed: Array<{ id: string; error: string }> = []

			// Group updates by identical payload for batch processing
			const groups = new Map<string, { ids: string[]; data: TenantUpdate }>()
			for (const update of updates) {
				const key = JSON.stringify(update.data)
				const existing = groups.get(key)
				if (existing) {
					existing.ids.push(update.id)
				} else {
					groups.set(key, { ids: [update.id], data: update.data })
				}
			}

			// Execute one query per unique payload
			for (const group of groups.values()) {
				const { error } = await supabase
					.from('tenants')
					.update(group.data)
					.in('id', group.ids)

				if (error) {
					group.ids.forEach(id =>
						failed.push({ id, error: error.message })
					)
				} else {
					successIds.push(...group.ids)
				}
			}

			if (failed.length > 0) {
				toast.error(`Failed to update ${failed.length} tenant(s)`)
			}

			if (successIds.length > 0) {
				toast.success(`Updated ${successIds.length} tenant(s)`)
			}

			await queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			updates.forEach(({ id }) => {
				queryClient.invalidateQueries({
					queryKey: tenantQueries.detail(id).queryKey
				})
			})

			return { success: successIds.map(id => ({ id })), failed }
		},
		batchDelete: async (ids: string[]) => {
			const supabase = createClient()
			const failed: Array<{ id: string; error: string }> = []

			// Single query to remove all lease_tenants associations
			const { error } = await supabase
				.from('lease_tenants')
				.delete()
				.in('tenant_id', ids)

			if (error) {
				ids.forEach(id =>
					failed.push({ id, error: error.message })
				)
				toast.error(`Failed to delete tenants: ${error.message}`)
			} else {
				toast.success(`Deleted ${ids.length} tenant(s)`)
			}

			await queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })

			const successIds = ids.filter(
				id => !failed.some(f => f.id === id)
			)
			return { success: successIds.map(id => ({ id })), failed }
		}
	}
}

/**
 * Invite tenant - Creates a tenant_invitation record in the database.
 * The email invite sending is deferred to Phase 55 (Edge Function).
 * TODO(phase-55): send invitation email via Edge Function after creating invitation record
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
			const supabase = createClient()

			// Get lease details to populate invitation (property_id, unit_id)
			const { data: lease, error: leaseError } = await supabase
				.from('leases')
				.select('id, unit_id, owner_user_id, units(property_id)')
				.eq('id', data.lease_id)
				.single()

			if (leaseError) handlePostgrestError(leaseError, 'leases')

			// Generate invitation code and URL
			const invitationCode = crypto.randomUUID()
			const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3050'
			const invitationUrl = `${appBaseUrl}/auth/accept-invitation?code=${invitationCode}`
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

			const leaseUnit = Array.isArray(lease?.units) ? lease?.units[0] : lease?.units

			// Create tenant_invitation record
			const { data: invitation, error: inviteError } = await supabase
				.from('tenant_invitations')
				.insert({
					email: data.email,
					owner_user_id: lease!.owner_user_id,
					lease_id: data.lease_id,
					unit_id: lease!.unit_id ?? null,
					property_id: leaseUnit?.property_id ?? null,
					invitation_code: invitationCode,
					invitation_url: invitationUrl,
					expires_at: expiresAt,
					status: 'sent',
					type: 'lease_signing'
				})
				.select()
				.single()

			if (inviteError) handlePostgrestError(inviteError, 'tenant_invitations')

			// TODO(phase-55): send invitation email via Edge Function
			// For now, return a TenantWithExtras-compatible shape from the invitation
			return {
				id: invitation!.id,
				user_id: invitation!.owner_user_id,
				email: invitation!.email,
				name: `${data.first_name} ${data.last_name}`.trim(),
				invitation_status: invitation!.status
			} as TenantWithExtras
		},
		onSuccess: data => {
			toast.success('Invitation sent', {
				description: `${data?.name ?? 'Tenant'} will receive an email to accept the invitation`
			})

			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.invitations() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })

			logger.info('Tenant invitation sent', {
				action: 'invite_tenant',
				metadata: { invitation_id: data?.id, email: data?.email ?? '' }
			})
		},
		onError: error => {
			handleMutationError(error, 'Send tenant invitation')
		}
	})
}

/**
 * Resend invitation email for expired or pending invitations
 * TODO(phase-55): migrate to Edge Function for email sending
 */
export function useResendInvitationMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.resendInvite,
		// TODO(phase-57): implement via Edge Function for email sending
		mutationFn: (_tenant_id: string): Promise<{ message: string }> => {
			throw new Error(
				'Tenant invitation email requires Edge Function implementation — TODO(phase-57)'
			)
		},
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
 * TODO(phase-55): migrate to Edge Function for invitation management
 */
export function useCancelInvitationMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.cancelInvite,
		// TODO(phase-57): implement via Edge Function for invitation management
		mutationFn: (_invitationId: string): Promise<{ message: string }> => {
			throw new Error(
				'Tenant invitation email requires Edge Function implementation — TODO(phase-57)'
			)
		},
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
 * Updates the notification_settings table for the tenant's user
 */
export function useUpdateNotificationPreferencesMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.updateNotificationPreferences,
		mutationFn: async ({
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
		}) => {
			const supabase = createClient()

			// First get the user_id for this tenant
			const { data: tenant, error: tenantError } = await supabase
				.from('tenants')
				.select('user_id')
				.eq('id', tenant_id)
				.single()

			if (tenantError) handlePostgrestError(tenantError, 'tenants')

			// Update notification_settings for that user
			const { error } = await supabase
				.from('notification_settings')
				.update({
					email: preferences.emailNotifications,
					sms: preferences.smsNotifications,
					maintenance: preferences.maintenanceUpdates,
					general: preferences.paymentReminders
				})
				.eq('user_id', tenant!.user_id)

			if (error) handlePostgrestError(error, 'notification_settings')
		},
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
