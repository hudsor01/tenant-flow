/**
 * Notifications hooks
 *
 * Provides TanStack Query hooks for notifications list + mutations via Supabase PostgREST.
 */

import { useMutation, useQuery, useQueryClient, mutationOptions } from '@tanstack/react-query'

import { createClient } from '#lib/supabase/client'
import { mutationKeys } from './mutation-keys'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import {
	notificationKeys,
	notificationQueries
} from './query-keys/notification-keys'
import type { Database } from '#types/supabase'

type NotificationItem = Database['public']['Tables']['notifications']['Row']

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

const notificationMutationFactories = {
	markRead: () =>
		mutationOptions({
			mutationKey: mutationKeys.notifications.markRead,
			mutationFn: async (id: string): Promise<{ success: boolean }> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('notifications')
					.update({ is_read: true, read_at: new Date().toISOString() })
					.eq('id', id)
				if (error) throw error
				return { success: true }
			}
		}),

	delete: () =>
		mutationOptions({
			mutationKey: mutationKeys.notifications.delete,
			mutationFn: async (id: string): Promise<{ success: boolean }> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('notifications')
					.delete()
					.eq('id', id)
				if (error) throw error
				return { success: true }
			}
		}),

	markAllRead: () =>
		mutationOptions<{ updated: number }, unknown, void>({
			mutationKey: mutationKeys.notifications.markAllRead,
			mutationFn: async (): Promise<{ updated: number }> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('notifications')
					.update({ is_read: true, read_at: new Date().toISOString() })
					.eq('is_read', false)
				if (error) throw error
				return { updated: 0 }
			}
		}),

	markBulkRead: () =>
		mutationOptions({
			mutationKey: mutationKeys.notifications.markBulkRead,
			mutationFn: async (ids: string[]): Promise<{ updated: number }> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('notifications')
					.update({ is_read: true, read_at: new Date().toISOString() })
					.in('id', ids)
				if (error) throw error
				return { updated: ids.length }
			}
		}),

	createMaintenance: () =>
		mutationOptions({
			mutationKey: mutationKeys.notifications.createMaintenance,
			mutationFn: async (payload: {
				user_id: string
				maintenanceId: string
				propertyName: string
				unit_number: string
			}): Promise<{ notification: NotificationItem }> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('notifications')
					.insert({
						user_id: payload.user_id,
						notification_type: 'maintenance',
						title: 'New maintenance request',
						message: `Maintenance request for ${payload.propertyName} unit ${payload.unit_number}`,
						entity_id: payload.maintenanceId,
						entity_type: 'maintenance_requests',
						is_read: false
					})
					.select()
					.single()
				if (error) throw error
				return { notification: data }
			}
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useNotifications(params?: {
	page?: number
	limit?: number
	unreadOnly?: boolean
}) {
	return useQuery(notificationQueries.list(params))
}

export function useUnreadNotificationsCount() {
	return useQuery(notificationQueries.unreadCount())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useMarkNotificationReadMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...notificationMutationFactories.markRead(),
		onSuccess: (_result, id) => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
			handleMutationSuccess(
				'Mark notification read',
				`Notification ${id} marked as read`
			)
		},
		onError: error => handleMutationError(error, 'Mark notification read')
	})
}

export function useDeleteNotificationMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...notificationMutationFactories.delete(),
		onSuccess: (_result, id) => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
			handleMutationSuccess('Delete notification', `Notification ${id} deleted`)
		},
		onError: error => handleMutationError(error, 'Delete notification')
	})
}

export function useMarkAllNotificationsReadMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...notificationMutationFactories.markAllRead(),
		onSuccess: result => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
			handleMutationSuccess(
				'Mark all notifications read',
				result.updated
					? `${result.updated} notification(s) marked as read`
					: 'No unread notifications'
			)
		},
		onError: error => handleMutationError(error, 'Mark all notifications read')
	})
}

export function useBulkMarkNotificationsReadMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...notificationMutationFactories.markBulkRead(),
		onSuccess: result => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
			handleMutationSuccess(
				'Mark selected notifications read',
				result.updated
					? `${result.updated} notification(s) marked as read`
					: 'No notifications updated'
			)
		},
		onError: error =>
			handleMutationError(error, 'Mark selected notifications read')
	})
}

export function useCreateMaintenanceNotificationMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...notificationMutationFactories.createMaintenance(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			handleMutationSuccess(
				'Create notification',
				'Maintenance notification sent'
			)
		},
		onError: error => handleMutationError(error, 'Create notification')
	})
}

export const notificationsKeys = notificationKeys
