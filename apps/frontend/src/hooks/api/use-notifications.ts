/**
 * Notifications hooks
 *
 * Provides TanStack Query hooks for notifications list + mutations via Supabase PostgREST.
 */

import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData
} from '@tanstack/react-query'

import { createClient } from '#lib/supabase/client'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import type { Database } from '@repo/shared/types/supabase'

type NotificationItem = Database['public']['Tables']['notifications']['Row']

interface PaginatedNotifications {
	data: NotificationItem[]
	total: number
	page: number
	limit: number
}

const notificationKeys = {
	all: ['notifications'] as const,
	list: (
		page: number,
		limit: number,
		unreadOnly: boolean,
		queryString?: string
	) => ['notifications', { page, limit, unreadOnly, queryString }] as const,
	unreadCount: ['notifications', 'unread-count'] as const
}

export function useNotifications(params?: {
	page?: number
	limit?: number
	unreadOnly?: boolean
}) {
	const page = params?.page ?? 1
	const limit = params?.limit ?? 20
	const unreadOnly = params?.unreadOnly ?? false
	const queryString = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(unreadOnly ? { unreadOnly: 'true' } : {})
	}).toString()

	return useQuery({
		queryKey: notificationKeys.list(page, limit, unreadOnly, queryString),
		queryFn: async (): Promise<PaginatedNotifications> => {
			const supabase = createClient()
			let query = supabase
				.from('notifications')
				.select('*', { count: 'exact' })

			if (unreadOnly) {
				query = query.eq('is_read', false)
			}

			const { data, count, error } = await query
				.order('created_at', { ascending: false })
				.range((page - 1) * limit, page * limit - 1)

			if (error) throw error

			return { data: data ?? [], total: count ?? 0, page, limit }
		},
		...QUERY_CACHE_TIMES.LIST,
		placeholderData: keepPreviousData
	})
}

export function useUnreadNotificationsCount() {
	return useQuery({
		queryKey: notificationKeys.unreadCount,
		queryFn: async (): Promise<PaginatedNotifications> => {
			const supabase = createClient()
			const { count, error } = await supabase
				.from('notifications')
				.select('id', { count: 'exact', head: true })
				.eq('is_read', false)

			if (error) throw error

			return { data: [], total: count ?? 0, page: 1, limit: 1 }
		},
		staleTime: 30_000,
		gcTime: 60_000
	})
}

export function useMarkNotificationReadMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.notifications.markRead,
		mutationFn: async (id: string): Promise<{ success: boolean }> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('notifications')
				.update({ is_read: true, read_at: new Date().toISOString() })
				.eq('id', id)

			if (error) throw error

			return { success: true }
		},
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
		mutationKey: mutationKeys.notifications.delete,
		mutationFn: async (id: string): Promise<{ success: boolean }> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('notifications')
				.delete()
				.eq('id', id)

			if (error) throw error

			return { success: true }
		},
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
		mutationKey: mutationKeys.notifications.markAllRead,
		mutationFn: async (): Promise<{ updated: number }> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('notifications')
				.update({ is_read: true, read_at: new Date().toISOString() })
				.eq('is_read', false)

			if (error) throw error

			// PostgREST does not return count of updated rows easily
			return { updated: 0 }
		},
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
		mutationKey: mutationKeys.notifications.markBulkRead,
		mutationFn: async (ids: string[]): Promise<{ updated: number }> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('notifications')
				.update({ is_read: true, read_at: new Date().toISOString() })
				.in('id', ids)

			if (error) throw error

			return { updated: ids.length }
		},
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
		},
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
