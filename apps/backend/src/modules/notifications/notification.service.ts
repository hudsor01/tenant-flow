import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'

type NotificationType =
	| 'subscription_created'
	| 'subscription_updated'
	| 'subscription_cancelled'
	| 'payment_succeeded'
	| 'payment_failed'
	| 'trial_ending'
	| 'subscription_renewed'

type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface CreateNotificationParams {
	user_id: string
	type: NotificationType
	title: string
	message: string
	priority?: NotificationPriority
	actionUrl?: string
	data?: Record<string, unknown> | null
}

/**
 * Notification Service - Ultra-native in-app notifications
 *
 * Direct Supabase integration for creating user notifications
 * Following KISS, DRY, and no abstractions principles
 */
@Injectable()
export class NotificationService {
	private readonly logger = new Logger(NotificationService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Create in-app notification for user
	 * Direct insert to notifications table via Supabase
	 */
	async createNotification(params: CreateNotificationParams): Promise<void> {
		try {
			const now = new Date().toISOString()
			const record: Database['public']['Tables']['notifications']['Insert'] = {
				user_id: params.user_id,
				notification_type: params.type,
				title: params.title,
				message: params.message,
				action_url: params.actionUrl ?? null,
				is_read: false,
				created_at: now
			}

			const { error } = await this.supabaseService
				.getAdminClient()
				.from('notifications')
				.insert(record)

			if (error) {
				this.logger.error('Failed to create notification', {
					error,
					user_id: params.user_id,
					type: params.type
				})
				throw error
			}

			this.logger.log('Notification created', {
				user_id: params.user_id,
				type: params.type,
				title: params.title
			})
		} catch (error) {
			this.logger.error('Error creating notification', {
				error: error instanceof Error ? error.message : String(error),
				params
			})
			// Don't throw - notifications are non-critical
		}
	}

	/**
	 * Create multiple notifications (batch operation)
	 * Useful for notifying multiple users at once
	 */
	async createBulkNotifications(
		notifications: CreateNotificationParams[]
	): Promise<void> {
		try {
			const now = new Date().toISOString()
			const records: Database['public']['Tables']['notifications']['Insert'][] =
				notifications.map(params => ({
					user_id: params.user_id,
					notification_type: params.type,
					title: params.title,
					message: params.message,
					action_url: params.actionUrl ?? null,
					is_read: false,
					created_at: now
				}))

			const { error } = await this.supabaseService
				.getAdminClient()
				.from('notifications')
				.insert(records)

			if (error) {
				this.logger.error('Failed to create bulk notifications', {
					error,
					count: notifications.length
				})
				throw error
			}

			this.logger.log('Bulk notifications created', {
				count: notifications.length
			})
		} catch (error) {
			this.logger.error('Error creating bulk notifications', {
				error: error instanceof Error ? error.message : String(error),
				count: notifications.length
			})
			// Don't throw - notifications are non-critical
		}
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string): Promise<void> {
		try {
			const { error } = await this.supabaseService
				.getAdminClient()
				.from('notifications')
				.update({
					is_read: true,
					read_at: new Date().toISOString()
				})
				.eq('id', notificationId)

			if (error) {
				this.logger.error('Failed to mark notification as read', {
					error,
					notificationId
				})
				throw error
			}
		} catch (error) {
			this.logger.error('Error marking notification as read', {
				error: error instanceof Error ? error.message : String(error),
				notificationId
			})
		}
	}

	/**
	 * Get unread notification count for user
	 */
	async getUnreadCount(user_id: string): Promise<number> {
		try {
			const { count, error } = await this.supabaseService
				.getAdminClient()
				.from('notifications')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', user_id)
				.eq('is_read', false)

			if (error) {
				this.logger.error('Failed to get unread count', {
					error,
					user_id
				})
				return 0
			}

			return count || 0
		} catch (error) {
			this.logger.error('Error getting unread count', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			return 0
		}
	}

	/**
	 * Clean up old notifications (older than 30 days)
	 * Should be called periodically via cron job
	 */
	async cleanupOldNotifications(): Promise<void> {
		try {
			const thirtyDaysAgo = new Date()
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

			const { error, count } = await this.supabaseService
				.getAdminClient()
				.from('notifications')
				.delete()
				.lt('created_at', thirtyDaysAgo.toISOString())
				.eq('is_read', true)

			if (error) {
				this.logger.error('Failed to cleanup old notifications', { error })
				throw error
			}

			this.logger.log('Old notifications cleaned up', { count })
		} catch (error) {
			this.logger.error('Error cleaning up old notifications', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}
}
