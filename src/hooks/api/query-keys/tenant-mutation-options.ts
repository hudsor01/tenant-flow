import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { logger } from '#lib/frontend-logger'
import type { Tenant, TenantWithLeaseInfo } from '#types/core'
import type {
	TenantCreate,
	TenantUpdate
} from '#lib/validation/tenants'
import { mutationKeys } from '../mutation-keys'

export const tenantMutations = {
	create: () =>
		mutationOptions({
			mutationKey: mutationKeys.tenants.create,
			mutationFn: async (data: TenantCreate): Promise<Tenant> => {
				const supabase = createClient()

				// RLS requires owner_user_id = auth.uid() for landlord-managed tenants.
				// Resolve the current session's user id and stamp it on the insert.
				let owner_user_id = data.owner_user_id
				if (!owner_user_id) {
					const {
						data: { user },
						error: userErr
					} = await supabase.auth.getUser()
					if (userErr) throw userErr
					if (!user) throw new Error('Not authenticated')
					owner_user_id = user.id
				}

				const { data: created, error } = await supabase
					.from('tenants')
					.insert({ ...data, owner_user_id })
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

				// Soft delete: do not touch auth users; only the landlord-managed tenant record.
				const { error } = await supabase
					.from('tenants')
					.update({ status: 'inactive', updated_at: new Date().toISOString() })
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

				const { error: updateError } = await supabase
					.from('tenants')
					.update({
						status: 'moved_out',
						updated_at: new Date().toISOString()
					})
					.eq('id', id)

				if (updateError) handlePostgrestError(updateError, 'tenants')

				const { data: updated, error: fetchError } = await supabase
					.from('tenants')
					.select(
						'*, users!tenants_user_id_fkey(id, email, first_name, last_name, full_name, phone, status), lease_tenants(lease_id, is_primary, leases(id, lease_status, start_date, end_date, rent_amount, security_deposit, unit_id, primary_tenant_id, owner_user_id, units(id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, property_id, properties(id, name, address_line1, address_line2, city, state, postal_code))))'
					)
					.eq('id', id)
					.single()

				if (fetchError) handlePostgrestError(fetchError, 'tenants')

				// Move-out reason has no DB column; persisted via audit log only.
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
