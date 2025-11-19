/**
 * Notification Preferences Hooks
 * Manage tenant notification preferences with TanStack Query
 */

import { clientFetch } from '#lib/api/client'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { logger } from '@repo/shared/lib/frontend-logger'
import { incrementVersion } from '@repo/shared/utils/optimistic-locking'
import type { NotificationPreferencesWithVersion } from '@repo/shared/types/relations'

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
	tenant: (tenant_id: string) =>
		[...notificationPreferencesKeys.all, tenant_id] as const
}

/**
 * Hook to fetch notification preferences for a tenant
 */
export function useNotificationPreferences(tenant_id: string) {
	return useQuery({
		queryKey: notificationPreferencesKeys.tenant(tenant_id),
		queryFn: () =>
			clientFetch<NotificationPreferences>(
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
export function useUpdateNotificationPreferences(tenant_id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (preferences: Partial<NotificationPreferences>) =>
			clientFetch<NotificationPreferences>(
				`/api/v1/tenants/${tenant_id}/notification-preferences`,
				{
					method: 'PUT',
					body: JSON.stringify(preferences)
				}
			),
		onMutate: async (newPreferences: Partial<NotificationPreferences>) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: notificationPreferencesKeys.tenant(tenant_id)
			})

			// Snapshot previous state
			const previousPreferences =
				queryClient.getQueryData<NotificationPreferences>(
					notificationPreferencesKeys.tenant(tenant_id)
				)

			// Optimistically update
			if (previousPreferences) {
			queryClient.setQueryData<NotificationPreferencesWithVersion>(
				notificationPreferencesKeys.tenant(tenant_id),
				(old: NotificationPreferencesWithVersion | undefined) =>
					old
					? (
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							incrementVersion(old, newPreferences as any) as any
						)
					: undefined
			)
		}

			return { previousPreferences }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousPreferences) {
				queryClient.setQueryData(
					notificationPreferencesKeys.tenant(tenant_id),
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(context.previousPreferences as any)
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
		onSuccess: (data) => {
			// Update cache with server response
			queryClient.setQueryData<NotificationPreferencesWithVersion>(
				notificationPreferencesKeys.tenant(tenant_id),
				(old: NotificationPreferencesWithVersion | undefined) =>
					old
						? (
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								incrementVersion(old, data as any) as NotificationPreferencesWithVersion
							)
						: (
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								data as any
							)
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
