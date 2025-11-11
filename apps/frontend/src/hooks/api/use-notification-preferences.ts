/**
 * Notification Preferences Hooks
 * Manage tenant notification preferences with TanStack Query
 */

import { clientFetch } from '#lib/api/client'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { logger } from '@repo/shared/lib/frontend-logger'

export interface NotificationPreferences {
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
	tenant: (tenantId: string) =>
		[...notificationPreferencesKeys.all, tenantId] as const
}

/**
 * Hook to fetch notification preferences for a tenant
 */
export function useNotificationPreferences(tenantId: string) {
	return useQuery({
		queryKey: notificationPreferencesKeys.tenant(tenantId),
		queryFn: () =>
			clientFetch<NotificationPreferences>(
				`/api/v1/tenants/${tenantId}/notification-preferences`
			),
		enabled: !!tenantId,
		...QUERY_CACHE_TIMES.DETAIL,
		retry: 2
	})
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences(tenantId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (preferences: Partial<NotificationPreferences>) =>
			clientFetch<NotificationPreferences>(
				`/api/v1/tenants/${tenantId}/notification-preferences`,
				{
					method: 'PUT',
					body: JSON.stringify(preferences)
				}
			),
		onMutate: async (newPreferences: Partial<NotificationPreferences>) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: notificationPreferencesKeys.tenant(tenantId)
			})

			// Snapshot previous state
			const previousPreferences =
				queryClient.getQueryData<NotificationPreferences>(
					notificationPreferencesKeys.tenant(tenantId)
				)

			// Optimistically update
			if (previousPreferences) {
				queryClient.setQueryData<NotificationPreferences>(
					notificationPreferencesKeys.tenant(tenantId),
					{
						...previousPreferences,
						...newPreferences
					}
				)
			}

			return { previousPreferences }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousPreferences) {
				queryClient.setQueryData(
					notificationPreferencesKeys.tenant(tenantId),
					context.previousPreferences
				)
			}

			logger.error('Failed to update notification preferences', {
				action: 'update_notification_preferences',
				metadata: {
					tenantId,
					error: err instanceof Error ? err.message : String(err)
				}
			})

			handleMutationError(err, 'Update notification preferences')
		},
		onSuccess: (data) => {
			// Update cache with server response
			queryClient.setQueryData(
				notificationPreferencesKeys.tenant(tenantId),
				data
			)

			handleMutationSuccess(
				'Update notification preferences',
				'Your notification preferences have been saved'
			)

			logger.info('Notification preferences updated', {
				action: 'update_notification_preferences',
				metadata: { tenantId }
			})
		}
	})
}
