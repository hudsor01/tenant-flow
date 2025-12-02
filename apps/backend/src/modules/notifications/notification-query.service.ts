/**
 * Notification Query Service
 * Handles notification CRUD operations and queries
 * Extracted from NotificationsService for SRP compliance
 */

import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'

/** Default pagination limit per Supabase best practices */
const DEFAULT_LIMIT = 50

@Injectable()
export class NotificationQueryService {
	private readonly logger = new Logger(NotificationQueryService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get unread notifications for a user with pagination
	 * Per Supabase docs: "You should keep the limit and paginate the rest"
	 */
	async getUnreadNotifications(
		user_id: string,
		limit = DEFAULT_LIMIT,
		offset = 0
	): Promise<Database['public']['Tables']['notifications']['Row'][]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.select('*')
			.eq('user_id', user_id)
			.eq('is_read', false)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1)

		if (error) {
			throw error
		}

		return data
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(
		notificationId: string,
		user_id: string
	): Promise<Database['public']['Tables']['notifications']['Row']> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq('id', notificationId)
			.eq('user_id', user_id)
			.select()
			.single()

		if (error) {
			throw error
		}

		return data
	}

	/**
	 * Get unread notification count
	 * Per NestJS best practices: throw on error instead of returning silent defaults
	 */
	async getUnreadCount(user_id: string): Promise<number> {
		const { count, error } = (await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user_id)
			.eq('is_read', false)) as { count: number | null; error: unknown }

		if (error) {
			this.logger.error('Failed to get unread notification count', {
				error,
				user_id
			})
			throw error
		}

		return count || 0
	}

	/**
	 * Mark all notifications as read
	 * Per NestJS best practices: throw on error instead of returning silent defaults
	 */
	async markAllAsRead(user_id: string): Promise<number> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.update({
				is_read: true,
				read_at: new Date().toISOString()
			})
			.eq('user_id', user_id)
			.eq('is_read', false)
			.select('*')

		if (error) {
			this.logger.error('Failed to mark all notifications as read', {
				error,
				user_id
			})
			throw error
		}

		return data?.length ?? 0
	}

	/**
	 * Cancel notification
	 */
	async cancelNotification(
		notificationId: string,
		user_id: string
	): Promise<Database['public']['Tables']['notifications']['Row']> {
		// First get the current notification
		const { data: currentData, error: fetchError } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.select()
			.eq('id', notificationId)
			.eq('user_id', user_id)
			.single()

		if (fetchError) {
			throw fetchError
		}

		// Then update it
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.update({
				message: '[CANCELLED] ' + (currentData?.message || ''),
				title: '[CANCELLED] ' + (currentData?.title || '')
			})
			.eq('id', notificationId)
			.eq('user_id', user_id)
			.select()
			.single()

		if (error) {
			throw error
		}

		this.logger.log(`Notification ${notificationId} cancelled for user ${user_id}`)
		return data
	}

	/**
	 * Delete old notifications
	 */
	async cleanupOldNotifications(daysToKeep = 30): Promise<void> {
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

		const { error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.delete()
			.lt('created_at', cutoffDate.toISOString())
			.eq('is_read', true)

		if (error) {
			throw error
		}
	}
}
