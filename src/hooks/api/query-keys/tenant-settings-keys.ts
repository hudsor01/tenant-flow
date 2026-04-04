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

				return {
					rentReminders: (data as Record<string, unknown> | null)?.rent_reminders as boolean ?? true,
					maintenanceUpdates: (data as Record<string, unknown> | null)?.maintenance_updates as boolean ?? true,
					propertyNotices: (data as Record<string, unknown> | null)?.property_notices as boolean ?? true,
					emailNotifications: (data as Record<string, unknown> | null)?.email_notifications as boolean ?? true,
					smsNotifications: (data as Record<string, unknown> | null)?.sms_notifications as boolean ?? false
				}
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
}
