/**
 * Vendor Mutation Options
 * mutationOptions() factories for vendor domain mutations.
 *
 * Contains ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled callbacks stay in hook files.
 *
 * Note: vendor mutation keys are not in the centralized mutation-keys.ts yet,
 * so these factories define mutationKey inline.
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import type {
	Vendor,
	VendorCreateInput,
	VendorUpdateInput
} from '../use-vendor'

// Explicit column list for vendor queries -- no select('*')
const VENDOR_SELECT_COLUMNS =
	'id, owner_user_id, name, email, phone, trade, hourly_rate, status, notes, created_at, updated_at'

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const vendorMutations = {
	create: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'create'] as const,
			mutationFn: async (data: VendorCreateInput): Promise<Vendor> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				const { data: created, error } = await supabase
					.from('vendors')
					.insert({ ...data, owner_user_id: ownerId })
					.select(VENDOR_SELECT_COLUMNS)
					.single()

				if (error) handlePostgrestError(error, 'vendors')

				return created as Vendor
			}
		}),

	update: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'update'] as const,
			mutationFn: async ({
				id,
				data
			}: {
				id: string
				data: VendorUpdateInput
			}): Promise<Vendor> => {
				const supabase = createClient()
				const { data: updated, error } = await supabase
					.from('vendors')
					.update(data)
					.eq('id', id)
					.select(VENDOR_SELECT_COLUMNS)
					.single()

				if (error) handlePostgrestError(error, 'vendors')

				return updated as Vendor
			}
		}),

	delete: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'delete'] as const,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('vendors')
					.delete()
					.eq('id', id)

				if (error) handlePostgrestError(error, 'vendors')
			}
		}),

	assign: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'assign'] as const,
			mutationFn: async ({
				vendorId,
				maintenanceId
			}: {
				vendorId: string
				maintenanceId: string
			}): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('maintenance_requests')
					.update({ vendor_id: vendorId, status: 'assigned' })
					.eq('id', maintenanceId)

				if (error) handlePostgrestError(error, 'maintenance_requests')
			}
		}),

	unassign: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'unassign'] as const,
			mutationFn: async (maintenanceId: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('maintenance_requests')
					.update({ vendor_id: null, status: 'needs_reassignment' })
					.eq('id', maintenanceId)

				if (error) handlePostgrestError(error, 'maintenance_requests')
			}
		})
}
