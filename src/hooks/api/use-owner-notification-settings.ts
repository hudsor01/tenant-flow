import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationChannelPreferences } from '#shared/types/notifications'
import type { Database } from '#shared/types/supabase'

import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'

export type OwnerNotificationSettings = NotificationChannelPreferences
export type OwnerNotificationSettingsUpdate = Partial<
	Omit<OwnerNotificationSettings, 'categories'>
> & {
	categories?: Partial<OwnerNotificationSettings['categories']>
}

type NotificationSettingsRow =
	Database['public']['Tables']['notification_settings']['Row']

/**
 * Map a flat notification_settings DB row to the NotificationChannelPreferences shape.
 * DB column in_app maps to type field inApp.
 */
function mapDbRowToPreferences(
	row: NotificationSettingsRow
): OwnerNotificationSettings {
	return {
		email: row.email,
		inApp: row.in_app,
		push: row.push,
		sms: row.sms,
		categories: {
			maintenance: row.maintenance,
			leases: row.leases,
			general: row.general
		}
	}
}

const defaultPreferences: OwnerNotificationSettings = {
	email: true,
	inApp: true,
	push: true,
	sms: false,
	categories: {
		maintenance: true,
		leases: true,
		general: true
	}
}

const notificationSettingsKey = ['owner', 'notification-settings'] as const

export function useOwnerNotificationSettings() {
	return useQuery({
		queryKey: notificationSettingsKey,
		queryFn: async (): Promise<OwnerNotificationSettings> => {
			const supabase = createClient()
			const user = await getCachedUser()

			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('notification_settings')
				.select('*')
				.eq('user_id', user.id)
				.maybeSingle()

			if (error) throw error

			if (data === null) return defaultPreferences

			return mapDbRowToPreferences(data)
		},
		...QUERY_CACHE_TIMES.DETAIL
	})
}

export function useUpdateOwnerNotificationSettingsMutation() {
	const queryClient = useQueryClient()

	return useMutation({
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
		},
		onMutate: async updates => {
			await queryClient.cancelQueries({ queryKey: notificationSettingsKey })

			const previous = queryClient.getQueryData<OwnerNotificationSettings>(
				notificationSettingsKey
			)

			if (previous) {
				queryClient.setQueryData<OwnerNotificationSettings>(
					notificationSettingsKey,
					(
						old: OwnerNotificationSettings | undefined
					): OwnerNotificationSettings | undefined => {
						if (!old) return undefined

						// Destructure categories out of updates to avoid Partial<> type conflict
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
				queryClient.setQueryData(notificationSettingsKey, context.previous)
			}

			handleMutationError(error, 'Update notification settings')
		},
		onSuccess: data => {
			queryClient.setQueryData(notificationSettingsKey, data)
			handleMutationSuccess(
				'Update notification settings',
				'Your notification preferences have been saved'
			)
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: notificationSettingsKey })
		}
	})
}
