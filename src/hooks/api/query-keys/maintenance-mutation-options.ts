/**
 * Maintenance Mutation Options
 * mutationOptions() factories for maintenance domain mutations.
 *
 * Contains ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled callbacks stay in hook files.
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import type { MaintenanceRequest } from '#types/core'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '#lib/validation/maintenance'
import { mutationKeys } from '../mutation-keys'

/** Variables for update mutation including optional optimistic locking version */
export interface MaintenanceUpdateMutationVariables {
	id: string
	data: MaintenanceRequestUpdate
	version?: number
}

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const maintenanceMutations = {
	create: () =>
		mutationOptions({
			mutationKey: mutationKeys.maintenance.create,
			mutationFn: async (
				data: MaintenanceRequestCreate
			): Promise<MaintenanceRequest> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				const { data: created, error } = await supabase
					.from('maintenance_requests')
					.insert({ ...data, owner_user_id: ownerId })
					.select()
					.single()

				if (error) handlePostgrestError(error, 'maintenance_requests')

				return created as MaintenanceRequest
			}
		}),

	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.maintenance.update,
			mutationFn: async ({
				id,
				data,
				version: _version
			}: MaintenanceUpdateMutationVariables): Promise<MaintenanceRequest> => {
				// Note: version is intentionally unused -- optimistic locking via version
				// is not implemented in the DB schema. The parameter is kept in the
				// interface for future compatibility.
				const supabase = createClient()

				const { data: updated, error } = await supabase
					.from('maintenance_requests')
					.update(data)
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'maintenance_requests')

				return updated as MaintenanceRequest
			}
		}),

	delete: () =>
		mutationOptions({
			mutationKey: mutationKeys.maintenance.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('maintenance_requests')
					.delete()
					.eq('id', id)

				if (error) handlePostgrestError(error, 'maintenance_requests')
			}
		})
}
