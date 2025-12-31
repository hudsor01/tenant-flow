/**
 * Tenant Notification Preferences Hooks
 *
 * Manage tenant-specific notification preferences with TanStack Query.
 * Note: These are different from owner notification settings (use-owner-notification-settings.ts)
 */

import { apiRequest } from '#lib/api-request'

import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { logger } from '@repo/shared/lib/frontend-logger'

/**
 * Tenant-specific notification preferences
 * Different from owner TenantNotificationPreferences in @repo/shared/types/notifications
 */
export interface TenantNotificationPreferences {
	rentReminders: boolean
	maintenanceUpdates: boolean
	propertyNotices: boolean
	emailNotifications: boolean
	smsNotifications: boolean
}

/**
 * Query keys for notification preferences
 */
export const notificationPreferencesKeys = {
	all: ['notification-preferences'] as const,
	tenant: (tenant_id: string) =>
		[...notificationPreferencesKeys.all, tenant_id] as const
}

/**
 * Hook to fetch notification preferences for a tenant
 */
export function useTenantNotificationPreferences(tenant_id: string) {
	return useQuery({
		queryKey: notificationPreferencesKeys.tenant(tenant_id),
		queryFn: () =>
			apiRequest<TenantNotificationPreferences>(
				`/api/v1/tenants/${tenant_id}/notification-preferences`
			),
		enabled: !!tenant_id,
		...QUERY_CACHE_TIMES.DETAIL,
		retry: 2
	})
}

/**
 * Hook to update notification preferences
 */
export function useUpdateTenantNotificationPreferences(tenant_id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (preferences: Partial<TenantNotificationPreferences>) =>
			apiRequest<TenantNotificationPreferences>(
				`/api/v1/tenants/${tenant_id}/notification-preferences`,
				{
					method: 'PUT',
					body: JSON.stringify(preferences)
				}
			),
		onMutate: async (newPreferences: Partial<TenantNotificationPreferences>) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: notificationPreferencesKeys.tenant(tenant_id)
			})

			// Snapshot previous state
			const previousPreferences =
				queryClient.getQueryData<TenantNotificationPreferences>(
					notificationPreferencesKeys.tenant(tenant_id)
				)

			// Optimistically update
			if (previousPreferences) {
				queryClient.setQueryData<TenantNotificationPreferences>(
					notificationPreferencesKeys.tenant(tenant_id),
					(old: TenantNotificationPreferences | undefined) =>
						old ? { ...old, ...newPreferences } : undefined
				)
			}

			return { previousPreferences }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousPreferences) {
				queryClient.setQueryData(
					notificationPreferencesKeys.tenant(tenant_id),
					context.previousPreferences
				)
			}

			logger.error('Failed to update notification preferences', {
				action: 'update_notification_preferences',
				metadata: {
					tenant_id,
					error: err instanceof Error ? err.message : String(err)
				}
			})

			handleMutationError(err, 'Update notification preferences')
		},
		onSuccess: data => {
			// Update cache with server response
			queryClient.setQueryData<TenantNotificationPreferences>(
				notificationPreferencesKeys.tenant(tenant_id),
				data
			)

			handleMutationSuccess(
				'Update notification preferences',
				'Your notification preferences have been saved'
			)

			logger.info('Notification preferences updated', {
				action: 'update_notification_preferences',
				metadata: { tenant_id }
			})
		}
	})
}
