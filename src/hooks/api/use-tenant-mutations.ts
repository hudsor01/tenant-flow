/**
 * Tenant Mutation Hooks
 * TanStack Query mutation hooks for tenant management
 *
 * Split from use-tenant.ts for the 300-line file size rule.
 * Query hooks remain in use-tenant.ts.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
	TenantWithLeaseInfoWithVersion
} from '#shared/types/core'

import { tenantQueries } from './query-keys/tenant-keys'
import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

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


