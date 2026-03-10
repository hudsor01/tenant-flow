'use client'

/**
 * Tenant Settings Hooks
 * Profile settings and notification preferences for tenant portal
 *
 * Split from use-tenant-portal.ts for 300-line compliance
 */

import {
	queryOptions,
	useQuery,
	useMutation,
	useQueryClient,
	mutationOptions
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { DEFAULT_RETRY_ATTEMPTS } from '#types/api-contracts'
import { logger } from '#lib/frontend-logger'
import { tenantPortalKeys } from './use-tenant-portal-keys'

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

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useTenantSettings() {
	return useQuery(tenantSettingsQueries.settings())
}

export function useTenantNotificationPreferences() {
	return useQuery(tenantSettingsQueries.notificationPreferences())
}

// ============================================================================
// MUTATION OPTIONS FACTORY
// ============================================================================

const tenantSettingsMutationFactories = {
	updateNotificationPreferences: () =>
		mutationOptions({
			mutationKey: mutationKeys.tenantNotificationPreferences.update,
			mutationFn: async (preferences: Partial<TenantNotificationPreferences>) => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				const { data, error } = await supabase
					.from('notification_settings')
					.upsert(
						{
							user_id: user.id,
							rent_reminders: preferences.rentReminders,
							maintenance_updates: preferences.maintenanceUpdates,
							property_notices: preferences.propertyNotices,
							email_notifications: preferences.emailNotifications,
							sms_notifications: preferences.smsNotifications
						},
						{ onConflict: 'user_id' }
					)
					.select('rent_reminders, maintenance_updates, property_notices, email_notifications, sms_notifications')
					.single()

				if (error) throw new Error(error.message)

				const row = data as Record<string, unknown>
				return {
					rentReminders: row.rent_reminders as boolean ?? true,
					maintenanceUpdates: row.maintenance_updates as boolean ?? true,
					propertyNotices: row.property_notices as boolean ?? true,
					emailNotifications: row.email_notifications as boolean ?? true,
					smsNotifications: row.sms_notifications as boolean ?? false
				} satisfies TenantNotificationPreferences
			}
		})
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useUpdateTenantNotificationPreferences() {
	const queryClient = useQueryClient()

	return useMutation({
		...tenantSettingsMutationFactories.updateNotificationPreferences(),
		onMutate: async (newPreferences: Partial<TenantNotificationPreferences>) => {
			await queryClient.cancelQueries({
				queryKey: tenantPortalKeys.notificationPreferences.detail()
			})

			const previousPreferences =
				queryClient.getQueryData<TenantNotificationPreferences>(
					tenantPortalKeys.notificationPreferences.detail()
				)

			if (previousPreferences) {
				queryClient.setQueryData<TenantNotificationPreferences>(
					tenantPortalKeys.notificationPreferences.detail(),
					(old: TenantNotificationPreferences | undefined) =>
						old ? { ...old, ...newPreferences } : undefined
				)
			}

			return { previousPreferences }
		},
		onError: (err, _variables, context) => {
			if (context?.previousPreferences) {
				queryClient.setQueryData(
					tenantPortalKeys.notificationPreferences.detail(),
					context.previousPreferences
				)
			}

			logger.error('Failed to update notification preferences', {
				action: 'update_notification_preferences',
				metadata: {
					error: err instanceof Error ? err.message : String(err)
				}
			})

			handleMutationError(err, 'Update notification preferences')
		},
		onSuccess: data => {
			queryClient.setQueryData<TenantNotificationPreferences>(
				tenantPortalKeys.notificationPreferences.detail(),
				data
			)

			handleMutationSuccess(
				'Update notification preferences',
				'Your notification preferences have been saved'
			)

			logger.info('Notification preferences updated', {
				action: 'update_notification_preferences'
			})
		}
	})
}
