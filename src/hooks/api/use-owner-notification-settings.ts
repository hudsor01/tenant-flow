import { useMutation, useQuery, useQueryClient, mutationOptions } from '@tanstack/react-query'
import type { Database } from '#types/supabase'

import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { mutationKeys } from './mutation-keys'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import {
	ownerNotificationSettingsKeys,
	ownerNotificationSettingsQueries,
	mapDbRowToPreferences,
	type OwnerNotificationSettings
} from './query-keys/owner-notification-settings-keys'


export type OwnerNotificationSettingsUpdate = Partial<
	Omit<OwnerNotificationSettings, 'categories'>
> & {
	categories?: Partial<OwnerNotificationSettings['categories']>
}

type NotificationSettingsRow =
	Database['public']['Tables']['notification_settings']['Row']

// ============================================================================
// MUTATION OPTIONS FACTORY
// ============================================================================

const ownerNotificationSettingsMutationFactories = {
	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.ownerNotificationSettings.update,
			mutationFn: async (
				updates: OwnerNotificationSettingsUpdate
			): Promise<OwnerNotificationSettings> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				const dbUpdate: Partial<NotificationSettingsRow> = {}

				if (updates.email !== undefined) dbUpdate.email = updates.email
				if (updates.inApp !== undefined) dbUpdate.in_app = updates.inApp
				if (updates.push !== undefined) dbUpdate.push = updates.push
				if (updates.sms !== undefined) dbUpdate.sms = updates.sms
				if (updates.categories?.maintenance !== undefined)
					dbUpdate.maintenance = updates.categories.maintenance
				if (updates.categories?.leases !== undefined)
					dbUpdate.leases = updates.categories.leases
				if (updates.categories?.general !== undefined)
					dbUpdate.general = updates.categories.general
				dbUpdate.updated_at = new Date().toISOString()

				const { data, error } = await supabase
					.from('notification_settings')
					.upsert({ user_id: user.id, ...dbUpdate }, { onConflict: 'user_id' })
					.select()
					.single()

				if (error) throw error

				return mapDbRowToPreferences(data)
			}
		})
}

// ============================================================================
// HOOKS
// ============================================================================

export function useOwnerNotificationSettings() {
	return useQuery(ownerNotificationSettingsQueries.detail())
}

export function useUpdateOwnerNotificationSettingsMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...ownerNotificationSettingsMutationFactories.update(),
		onMutate: async updates => {
			await queryClient.cancelQueries({ queryKey: ownerNotificationSettingsKeys.all })

			const previous = queryClient.getQueryData<OwnerNotificationSettings>(
				ownerNotificationSettingsKeys.all
			)

			if (previous) {
				queryClient.setQueryData<OwnerNotificationSettings>(
					ownerNotificationSettingsKeys.all,
					(
						old: OwnerNotificationSettings | undefined
					): OwnerNotificationSettings | undefined => {
						if (!old) return undefined

						const { categories: updatedCategories, ...restUpdates } = updates

						return {
							...old,
							...restUpdates,
							categories: updatedCategories
								? {
										maintenance:
											updatedCategories.maintenance ??
											old.categories.maintenance,
										leases: updatedCategories.leases ?? old.categories.leases,
										general: updatedCategories.general ?? old.categories.general
									}
								: old.categories
						}
					}
				)
			}

			return { previous }
		},
		onError: (error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(ownerNotificationSettingsKeys.all, context.previous)
			}

			handleMutationError(error, 'Update notification settings')
		},
		onSuccess: data => {
			queryClient.setQueryData(ownerNotificationSettingsKeys.all, data)
			handleMutationSuccess(
				'Update notification settings',
				'Your notification preferences have been saved'
			)
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ownerNotificationSettingsKeys.all })
		}
	})
}
