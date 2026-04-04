/**
 * Notification Query Keys & Options
 * queryOptions() factories for notifications domain.
 */

import { queryOptions, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { Database } from '#types/supabase'

type NotificationItem = Database['public']['Tables']['notifications']['Row']

/** Subset of notification columns for list views. */
type NotificationListItem = Pick<
	NotificationItem,
	| 'id'
	| 'user_id'
	| 'notification_type'
	| 'title'
	| 'message'
	| 'is_read'
	| 'entity_type'
	| 'entity_id'
	| 'action_url'
	| 'read_at'
	| 'created_at'
>

export interface PaginatedNotifications {
	data: NotificationListItem[]
	total: number
	page: number
	limit: number
}

export const notificationKeys = {
	all: ['notifications'] as const,
	list: (
		page: number,
		limit: number,
		unreadOnly: boolean,
		queryString?: string
	) => ['notifications', { page, limit, unreadOnly, queryString }] as const,
	unreadCount: ['notifications', 'unread-count'] as const
}

export const notificationQueries = {
	list: (params?: {
		page?: number
		limit?: number
		unreadOnly?: boolean
	}) => {
		const page = params?.page ?? 1
		const limit = params?.limit ?? 20
		const unreadOnly = params?.unreadOnly ?? false
		const queryString = new URLSearchParams({
			page: String(page),
			limit: String(limit),
			...(unreadOnly ? { unreadOnly: 'true' } : {})
		}).toString()

		return queryOptions({
			queryKey: notificationKeys.list(page, limit, unreadOnly, queryString),
			queryFn: async (): Promise<PaginatedNotifications> => {
				const supabase = createClient()
				let query = supabase
					.from('notifications')
					.select(
						'id, user_id, notification_type, title, message, is_read, entity_type, entity_id, action_url, read_at, created_at',
						{ count: 'exact' }
					)

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
	},

	unreadCount: () =>
		queryOptions({
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
