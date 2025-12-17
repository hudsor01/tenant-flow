import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationPreferences } from '@repo/shared/types/notifications'

import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'

export type OwnerNotificationSettings = NotificationPreferences
export type OwnerNotificationSettingsUpdate = Partial<
	Omit<OwnerNotificationSettings, 'categories'>
> & {
	categories?: Partial<OwnerNotificationSettings['categories']>
}

const notificationSettingsKey = ['owner', 'notification-settings'] as const

export function useOwnerNotificationSettings() {
	return useQuery({
		queryKey: notificationSettingsKey,
		queryFn: () =>
			apiRequest<OwnerNotificationSettings>('/api/v1/notification-settings'),
		...QUERY_CACHE_TIMES.DETAIL,
		retry: 2
	})
}

export function useUpdateOwnerNotificationSettings() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (updates: OwnerNotificationSettingsUpdate) =>
			apiRequest<OwnerNotificationSettings>('/api/v1/notification-settings', {
				method: 'PUT',
				body: JSON.stringify(updates)
			}),
		onMutate: async updates => {
			await queryClient.cancelQueries({ queryKey: notificationSettingsKey })

			const previous =
				queryClient.getQueryData<OwnerNotificationSettings>(
					notificationSettingsKey
				)

			if (previous) {
				queryClient.setQueryData<OwnerNotificationSettings>(
					notificationSettingsKey,
					(old: OwnerNotificationSettings | undefined): OwnerNotificationSettings | undefined => {
						if (!old) return undefined

						// Destructure categories out of updates to avoid Partial<> type conflict
						const { categories: updatedCategories, ...restUpdates } = updates

						return {
							...old,
							...restUpdates,
							categories: updatedCategories
								? {
										maintenance: updatedCategories.maintenance ?? old.categories.maintenance,
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
