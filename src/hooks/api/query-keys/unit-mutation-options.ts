/**
 * Unit Mutation Options
 * mutationOptions() factories for unit domain mutations.
 *
 * Contains ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled callbacks stay in hook files.
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import type { Unit } from '#shared/types/core'
import type { UnitInput, UnitUpdate } from '#shared/validation/units'
import { mutationKeys } from '../mutation-keys'

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const unitMutations = {
	create: () =>
		mutationOptions({
			mutationKey: mutationKeys.units.create,
			mutationFn: async (data: UnitInput): Promise<Unit> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				const { data: created, error } = await supabase
					.from('units')
					.insert({ ...data, owner_user_id: ownerId })
					.select()
					.single()

				if (error) handlePostgrestError(error, 'units')

				return created as Unit
			}
		}),

	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.units.update,
			mutationFn: async ({
				id,
				data,
				version
			}: {
				id: string
				data: UnitUpdate
				version?: number
			}): Promise<Unit> => {
				const supabase = createClient()
				const updatePayload = version ? { ...data, version } : { ...data }
				const { data: updated, error } = await supabase
					.from('units')
					.update(updatePayload)
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'units')

				return updated as Unit
			}
		}),

	delete: () =>
		mutationOptions({
			mutationKey: mutationKeys.units.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('units')
					.update({ status: 'inactive' })
					.eq('id', id)

				if (error) handlePostgrestError(error, 'units')
			}
		})
}
