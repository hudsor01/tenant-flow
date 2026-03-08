/**
 * Tenant Mutation Options
 * mutationOptions() factories for tenant domain mutations.
 *
 * Contains ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled callbacks stay in hook files.
 *
 * Invitation mutations are separate (use-tenant-invite-mutations.ts).
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { logger } from '#shared/lib/frontend-logger'
import type { Tenant, TenantWithLeaseInfo } from '#shared/types/core'
import type {
	TenantCreate,
	TenantUpdate
} from '#shared/validation/tenants'
import { mutationKeys } from '../mutation-keys'

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const tenantMutations = {
	create: () =>
		mutationOptions({
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
			}
		}),

	update: () =>
		mutationOptions({
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
			}
		}),

	delete: () =>
		mutationOptions({
			mutationKey: mutationKeys.tenants.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()

				// Check for active leases before allowing deletion
				const { data: activeLeases, error: leaseError } = await supabase
					.from('lease_tenants')
					.select('lease_id, leases!inner(id, lease_status)')
					.eq('tenant_id', id)
					.eq('leases.lease_status', 'active')

				if (leaseError) handlePostgrestError(leaseError, 'lease_tenants')

				if (activeLeases && activeLeases.length > 0) {
					throw new Error(
						'Cannot delete tenant with active lease. End or transfer the lease before removing them.'
					)
				}

				// Soft-delete: mark tenant as inactive
				const { error } = await supabase
					.from('tenants')
					.update({ status: 'inactive' })
					.eq('id', id)

				if (error) handlePostgrestError(error, 'tenants')
			}
		}),

	markMovedOut: () =>
		mutationOptions({
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
			}
		})
}
