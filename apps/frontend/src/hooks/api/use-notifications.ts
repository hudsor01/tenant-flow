/**
 * Notifications hooks
 *
 * Provides TanStack Query hooks for notifications list + mutations.
 * Uses existing apiRequest helper for Supabase auth token injection.
 */

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'

import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import type { Database } from '@repo/shared/types/supabase'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

interface PaginatedNotifications {
	data: NotificationRow[]
	total: number
	page: number
	limit: number
}

const notificationKeys = {
	all: ['notifications'] as const,
	list: (page: number, limit: number, unreadOnly: boolean, queryString?: string) =>
		['notifications', { page, limit, unreadOnly, queryString }] as const,
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
		queryFn: () =>
			apiRequest<PaginatedNotifications>(
				`/api/v1/notifications?${queryString}`
			),
		...QUERY_CACHE_TIMES.LIST,
		placeholderData: keepPreviousData
	})
}

export function useUnreadNotificationsCount() {
	return useQuery({
		queryKey: notificationKeys.unreadCount,
		queryFn: () =>
			apiRequest<PaginatedNotifications>(
				`/api/v1/notifications?page=1&limit=1&unreadOnly=true`
			),
		staleTime: 30_000,
		gcTime: 60_000
	})
}

export function useMarkNotificationRead() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			apiRequest<{ success: boolean }>(
				`/api/v1/notifications/${id}/read`,
				{ method: 'PUT' }
			),
		onSuccess: (_result, id) => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
			handleMutationSuccess(
				'Mark notification read',
				`Notification ${id} marked as read`
			)
		},
		onError: (error) => handleMutationError(error, 'Mark notification read')
	})
}

export function useDeleteNotification() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			apiRequest<{ success: boolean }>(
				`/api/v1/notifications/${id}`,
				{ method: 'DELETE' }
			),
		onSuccess: (_result, id) => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
			handleMutationSuccess(
				'Delete notification',
				`Notification ${id} deleted`
			)
		},
		onError: (error) => handleMutationError(error, 'Delete notification')
	})
}

export function useMarkAllNotificationsRead() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			apiRequest<{ updated: number }>('/api/v1/notifications/read-all', {
				method: 'PUT'
			}),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
			handleMutationSuccess(
				'Mark all notifications read',
				result.updated
					? `${result.updated} notification(s) marked as read`
					: 'No unread notifications'
			)
		},
		onError: (error) => handleMutationError(error, 'Mark all notifications read')
	})
}

export function useBulkMarkNotificationsRead() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (ids: string[]) =>
			apiRequest<{ updated: number }>('/api/v1/notifications/bulk-read', {
				method: 'PUT',
				body: JSON.stringify({ ids })
			}),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
			handleMutationSuccess(
				'Mark selected notifications read',
				result.updated
					? `${result.updated} notification(s) marked as read`
					: 'No notifications updated'
			)
		},
		onError: (error) =>
			handleMutationError(error, 'Mark selected notifications read')
	})
}

export function useCreateMaintenanceNotification() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (payload: {
			user_id: string
			maintenanceId: string
			propertyName: string
			unit_number: string
		}) =>
			apiRequest<{ notification: NotificationRow }>(
				'/api/v1/notifications/maintenance',
				{
					method: 'POST',
					body: JSON.stringify(payload)
				}
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: notificationKeys.all })
			handleMutationSuccess(
				'Create notification',
				'Maintenance notification sent'
			)
		},
		onError: (error) => handleMutationError(error, 'Create notification')
	})
}

export const notificationsKeys = notificationKeys
