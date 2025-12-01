/**
 * Notification Query Service
 * Handles notification CRUD operations and queries
 * Extracted from NotificationsService for SRP compliance
 */

import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class NotificationQueryService {
	private readonly logger = new Logger(NotificationQueryService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get unread notifications for a user
	 */
	async getUnreadNotifications(
		user_id: string
	): Promise<Database['public']['Tables']['notifications']['Row'][]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.select('*')
			.eq('user_id', user_id)
			.eq('isRead', false)
			.order('created_at', { ascending: false })

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
	 */
	async getUnreadCount(user_id: string): Promise<number> {
		try {
			this.logger.log('Getting unread notification count', { user_id })

			const { count, error } = (await this.supabaseService
				.getAdminClient()
				.from('notifications')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', user_id)
				.eq('isRead', false)) as { count: number | null; error: unknown }

			if (error) {
				this.logger.error('Failed to get unread notification count', {
					error,
					user_id
				})
				return 0
			}

			return count || 0
		} catch (error) {
			this.logger.error('Error getting unread notification count', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			return 0
		}
	}

	/**
	 * Mark all notifications as read
	 */
	async markAllAsRead(user_id: string): Promise<number> {
		try {
			this.logger.log('Marking all notifications as read', { user_id })

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
				return 0
			}

			return data?.length ?? 0
		} catch (error) {
			this.logger.error('Error marking all notifications as read', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			return 0
		}
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
