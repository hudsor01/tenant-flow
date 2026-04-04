/**
 * Tenant Settings Query Keys & Options
 * queryOptions() factories for tenant settings domain.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { DEFAULT_RETRY_ATTEMPTS } from '#types/api-contracts'
import { tenantPortalKeys } from '../use-tenant-portal-keys'

// ============================================================================
// TYPES
// ============================================================================

export interface TenantProfile {
	id: string
	first_name: string | null
	last_name: string | null
	email: string | null
	phone: string | null
}

export interface TenantSettings {
	profile: TenantProfile
}

export interface TenantNotificationPreferences {
	rentReminders: boolean
	maintenanceUpdates: boolean
	propertyNotices: boolean
	emailNotifications: boolean
	smsNotifications: boolean
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const tenantSettingsQueries = {
	settings: () =>
		queryOptions({
			queryKey: tenantPortalKeys.settings.all(),
			queryFn: async (): Promise<TenantSettings> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				const { data: userData } = await supabase
					.from('users')
					.select('first_name, last_name, email, phone')
					.eq('id', user.id)
					.single()

				return {
					profile: {
						id: user.id,
						first_name: userData?.first_name ?? null,
						last_name: userData?.last_name ?? null,
						email: userData?.email ?? user.email ?? null,
						phone: userData?.phone ?? null
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	notificationPreferences: () =>
		queryOptions({
			queryKey: tenantPortalKeys.notificationPreferences.detail(),
			queryFn: async (): Promise<TenantNotificationPreferences> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				const { data } = await supabase
					.from('notification_settings')
					.select(
						'rent_reminders, maintenance_updates, property_notices, email_notifications, sms_notifications'
					)
					.eq('user_id', user.id)
					.single()

				const row = data as {
					rent_reminders: boolean | null
					maintenance_updates: boolean | null
					property_notices: boolean | null
					email_notifications: boolean | null
					sms_notifications: boolean | null
				} | null
				return {
					rentReminders: row?.rent_reminders ?? true,
					maintenanceUpdates: row?.maintenance_updates ?? true,
					propertyNotices: row?.property_notices ?? true,
					emailNotifications: row?.email_notifications ?? true,
					smsNotifications: row?.sms_notifications ?? false
				}
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
}
