/**
 * Owner Notification Settings Query Keys & Options
 * queryOptions() factories for owner notification settings domain.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { NotificationChannelPreferences } from '#types/notifications'
import type { Database } from '#types/supabase'

export type OwnerNotificationSettings = NotificationChannelPreferences

type NotificationSettingsRow =
	Database['public']['Tables']['notification_settings']['Row']

export function mapDbRowToPreferences(
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

export const ownerNotificationSettingsKeys = {
	all: ['owner', 'notification-settings'] as const
}

export const ownerNotificationSettingsQueries = {
	detail: () =>
		queryOptions({
			queryKey: ownerNotificationSettingsKeys.all,
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
