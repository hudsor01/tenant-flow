import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import type { MaintenanceNotificationData } from '@repo/shared/types/notifications'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	requiredDescription,
	requiredString,
	requiredTitle,
	uuidSchema
} from '@repo/shared/validation/common'
import { z } from 'zod'
import { SupabaseService } from '../../database/supabase.service'
import { FailedNotificationsService } from './failed-notifications.service'
import {
	LeaseExpiringEvent,
	MaintenanceUpdatedEvent,
	PaymentFailedEvent,
	PaymentReceivedEvent,
	TenantCreatedEvent
} from './events/notification.events'

type NotificationType = 'maintenance' | 'lease' | 'payment' | 'system'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface TenantInvitedEventPayload {
	tenantId: string
	leaseId: string
	ownerId: string
	checkoutUrl: string
}

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly failedNotifications: FailedNotificationsService
	) {}

	/**
	 * Zod schemas for notification validation
	 */
	private static readonly NOTIFICATION_SCHEMAS = {
		maintenanceNotification: z.object({
			recipientId: uuidSchema,
			title: requiredTitle,
			message: requiredDescription,
			type: requiredString,
			priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
				message: 'Invalid priority level'
			}),
			actionUrl: z.string().optional(),
			maintenanceId: uuidSchema.optional(),
			data: z.object({
				propertyName: requiredString,
				unitNumber: requiredString,
				description: z.string().max(200, 'Description too long'),
				requestTitle: requiredString
			})
		}),

		notificationInput: z.object({
			ownerId: uuidSchema,
			title: requiredTitle,
			description: requiredDescription,
			priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
			propertyName: requiredString,
			unitNumber: requiredString,
			maintenanceId: uuidSchema.optional(),
			actionUrl: z.string().url('Invalid URL format').optional()
		})
	}

	/**
	 * Get notification type based on maintenance priority and urgency
	 */
	getNotificationType(
		priority: Priority,
		isNewRequest = false
	): NotificationType {
		const baseType = isNewRequest
			? 'maintenance_request_created'
			: 'maintenance_update'

		switch (priority) {
			case 'URGENT':
				return `${baseType}_emergency` as NotificationType
			case 'HIGH':
				return `${baseType}_high` as NotificationType
			case 'MEDIUM':
				return `${baseType}_medium` as NotificationType
			case 'LOW':
				return `${baseType}_low` as NotificationType
			default:
				return baseType as NotificationType
		}
	}

	/**
	 * Get priority label for display
	 */
	getPriorityLabel(priority: Priority): string {
		const labels = {
			URGENT: 'Urgent',
			HIGH: 'High Priority',
			MEDIUM: 'Medium Priority',
			LOW: 'Low Priority'
		}
		return labels[priority] || priority
	}

	/**
	 * Get notification urgency for system processing
	 */
	getNotificationUrgency(priority: Priority): boolean {
		return priority === 'URGENT' || priority === 'HIGH'
	}

	/**
	 * Create and send maintenance notification
	 */
	async createMaintenanceNotification(
		ownerId: string,
		title: string,
		description: string,
		priority: Priority,
		propertyName: string,
		unitNumber: string,
		maintenanceId?: string,
		actionUrl?: string
	): Promise<MaintenanceNotificationData> {
		// Validate input data using Zod directly (no wrapper abstractions)
		const validationResult =
			NotificationsService.NOTIFICATION_SCHEMAS.notificationInput.safeParse({
				ownerId,
				title,
				description,
				priority,
				propertyName,
				unitNumber,
				maintenanceId,
				actionUrl
			})

		if (!validationResult.success) {
			this.logger.error('Notification validation failed', {
				validationErrors: validationResult.error.format()
			})
			const errorMessages = validationResult.error.issues
				.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
				.join(', ')
			throw new BadRequestException(
				`Invalid notification input: ${errorMessages}`
			)
		}

		const priorityLabel = this.getPriorityLabel(priority)

		const notification = {
			recipientId: ownerId,
			title: `${priorityLabel} Maintenance Request`,
			message: `New maintenance request for ${propertyName} - Unit ${unitNumber}: ${title}`,
			type: this.getNotificationType(priority, true),
			priority: priority,
			actionUrl: actionUrl ?? '/maintenance',
			maintenanceId: maintenanceId || '',
			unitId: '', // Will be populated when we have the actual unit ID
			category: 'GENERAL', // Default category
			data: {
				propertyName,
				unitNumber,
				description: description.substring(0, 200), // Truncate for notification
				requestTitle: title
			}
		}

		// Validate notification data with Zod directly (no wrapper abstractions)
		const notificationValidation =
			NotificationsService.NOTIFICATION_SCHEMAS.maintenanceNotification.safeParse(
				notification
			)

		if (!notificationValidation.success) {
			this.logger.error('Notification data validation failed', {
				validationErrors: notificationValidation.error.format()
			})
			const errorMessages = notificationValidation.error.issues
				.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
				.join(', ')
			throw new BadRequestException(
				`Invalid notification data: ${errorMessages}`
			)
		}

		// Store notification in database using existing notifications table
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.insert({
				userId: notification.recipientId,
				title: notification.title,
				content: notification.message,
				type: notification.type,
				priority: notification.priority.toLowerCase(),
				metadata: {
					actionUrl: notification.actionUrl,
					maintenanceId: notification.maintenanceId,
					...notification.data
				},
				maintenanceRequestId: notification.maintenanceId,
				isRead: false
			})
			.select()
			.single()

		if (error) {
			throw error
		}

		// If high priority, trigger immediate sending
		if (this.shouldSendImmediately(priority)) {
			await this.sendImmediateNotification(notification)
		}

		return notification as unknown as MaintenanceNotificationData
	}

	/**
	 * Calculate notification timeout based on priority
	 */
	getNotificationTimeout(priority: Priority): number {
		switch (priority) {
			case 'URGENT':
				return 15000
			case 'HIGH':
				return 12000
			case 'MEDIUM':
				return 8000
			case 'LOW':
				return 5000
			default:
				return 8000
		}
	}

	/**
	 * Determine if notification should be sent immediately
	 */
	shouldSendImmediately(priority: Priority): boolean {
		return priority === 'URGENT' || priority === 'HIGH'
	}

	/**
	 * Send immediate notification (email for high priority)
	 */
	private async sendImmediateNotification(notification: {
		recipientId: string
		type: string
		title: string
	}): Promise<void> {
		try {
			// Get user email from database
			const { data: user, error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('email')
				.eq('id', notification.recipientId)
				.single()

			if (error || !user.email) {
				this.logger.warn(
					{
						notification: {
							recipientId: notification.recipientId,
							type: notification.type,
							title: notification.title
						},
						user: {
							found: !error,
							hasEmail: !!user?.email
						}
					},
					`Could not find email for user ${notification.recipientId}`
				)
				return
			}

			// Email notifications removed for MVP - focus on in-app notifications only
			this.logger.log(
				{
					notification: {
						recipientId: notification.recipientId,
						type: notification.type,
						title: notification.title
					},
					mvp: {
						emailDisabled: true,
						inAppOnly: true
					}
				},
				`In-app notification sent for user ${notification.recipientId} (email disabled for MVP)`
			)
		} catch (error) {
			this.logger.error(
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error),
						stack:
							process.env.NODE_ENV !== 'production' && error instanceof Error
								? error.stack
								: undefined
					},
					notification: {
						recipientId: notification.recipientId,
						type: notification.type
					}
				},
				'Failed to send immediate notification'
			)
			// Don't throw - notification was still stored in database
		}
	}

	/**
	 * Get unread notifications for a user
	 */
	async getUnreadNotifications(
		userId: string
	): Promise<Database['public']['Tables']['notifications']['Row'][]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.select('*')
			.eq('userId', userId)
			.eq('isRead', false)
			.order('createdAt', { ascending: false })

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
		userId: string
	): Promise<Database['public']['Tables']['notifications']['Row']> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.update({ isRead: true, readAt: new Date().toISOString() })
			.eq('id', notificationId)
			.eq('userId', userId)
			.select()
			.single()

		if (error) {
			throw error
		}

		return data
	}

	/**
	 * Cancel notification
	 */
	async cancelNotification(
		notificationId: string,
		userId: string
	): Promise<Database['public']['Tables']['notifications']['Row']> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.update({
				metadata: {
					cancelled: true,
					cancelledAt: new Date().toISOString()
				}
			})
			.eq('id', notificationId)
			.eq('userId', userId)
			.select()
			.single()

		if (error) {
			throw error
		}

		this.logger.log(
			{
				notification: {
					id: notificationId,
					userId,
					action: 'cancelled'
				}
			},
			`Notification ${notificationId} cancelled for user ${userId}`
		)
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
			.lt('createdAt', cutoffDate.toISOString())
			.eq('isRead', true)

		if (error) {
			throw error
		}
	}

	/**
	 * Get unread notification count - replaces get_unread_notification_count function
	 * Uses direct table query instead of database function
	 */
	async getUnreadCount(userId: string): Promise<number> {
		try {
			this.logger.log('Getting unread notification count via direct query', {
				userId
			})

			// Type assertion needed due to Supabase generated types limitation
			// When using head: true with count: 'exact', TypeScript doesn't infer count field
			const { count, error } = (await this.supabaseService
				.getAdminClient()
				.from('notifications')
				.select('*', { count: 'exact', head: true })
				.eq('userId', userId)
				.eq('isRead', false)) as { count: number | null; error: unknown }

			if (error) {
				this.logger.error('Failed to get unread notification count', {
					error,
					userId
				})
				return 0
			}

			return count || 0
		} catch (error) {
			this.logger.error('Error getting unread notification count', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return 0
		}
	}

	/**
	 * Mark all notifications as read - replaces mark_all_notifications_read function
	 * Uses direct table update instead of database function
	 */
	async markAllAsRead(userId: string): Promise<number> {
		try {
			this.logger.log('Marking all notifications as read via direct query', {
				userId
			})

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('notifications')
				.update({
					isRead: true,
					readAt: new Date().toISOString()
				})
				.eq('userId', userId)
				.eq('isRead', false)
				.select('*')

			if (error) {
				this.logger.error('Failed to mark all notifications as read', {
					error,
					userId
				})
				return 0
			}

			return data?.length ?? 0
		} catch (error) {
			this.logger.error('Error marking all notifications as read', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return 0
		}
	}

	// ==================
	// NATIVE EVENT LISTENERS - No Custom Abstractions
	// ==================

	/**
	 * Handle maintenance update events
	 */
	@OnEvent('maintenance.updated')
	async handleMaintenanceUpdated(event: MaintenanceUpdatedEvent) {
		this.logger.log(
			`Processing maintenance updated event for user ${event.userId}`,
			{
				maintenanceId: event.maintenanceId,
				priority: event.priority,
				status: event.status
			}
		)

		//Retry with exponential backoff instead of silent failure
		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createMaintenanceNotification(
					event.userId,
					event.title,
					event.description,
					event.priority,
					event.propertyName,
					event.unitNumber,
					event.maintenanceId
				)

				this.logger.log(
					`Maintenance notification created for user ${event.userId}`
				)
			},
			'maintenance.updated',
			event
		)
	}

	/**
	 * Handle payment received events
	 */
	@OnEvent('payment.received')
	async handlePaymentReceived(event: PaymentReceivedEvent) {
		this.logger.log(
			`Processing payment received event for user ${event.userId}`,
			{
				subscriptionId: event.subscriptionId,
				amount: event.amount,
				currency: event.currency
			}
		)

		//Retry with exponential backoff instead of silent failure
		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createPaymentNotification(
					event.userId,
					'Payment Received',
					event.description,
					'MEDIUM',
					'Subscription', // Generic property name for payments
					event.subscriptionId,
					event.subscriptionId
				)

				this.logger.log(`Payment notification created for user ${event.userId}`)
			},
			'payment.received',
			event
		)
	}

	/**
	 * Handle payment failed events
	 */
	@OnEvent('payment.failed')
	async handlePaymentFailed(event: PaymentFailedEvent) {
		this.logger.log(
			`Processing payment failed event for user ${event.userId}`,
			{
				amount: event.amount,
				reason: event.reason,
				currency: event.currency
			}
		)

		//Retry with exponential backoff instead of silent failure
		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createPaymentNotification(
					event.userId,
					'Payment Failed',
					event.reason,
					'HIGH',
					'Subscription', // Generic property name for payments
					event.subscriptionId,
					undefined,
					'/billing/payment-methods'
				)

				this.logger.log(
					`Payment failed notification created for user ${event.userId}`
				)
			},
			'payment.failed',
			event
		)
	}

	/**
	 * Handle tenant created events
	 */
	@OnEvent('tenant.created')
	async handleTenantCreated(event: TenantCreatedEvent) {
		this.logger.log(
			`Processing tenant created event for user ${event.userId}`,
			{
				tenantName: event.tenantName,
				tenantEmail: event.tenantEmail,
				tenantId: event.tenantId
			}
		)

		//Retry with exponential backoff instead of silent failure
		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createSystemNotification(
					event.userId,
					'New Tenant Added',
					event.description,
					'LOW',
					'/tenants'
				)

				this.logger.log(
					`Tenant created notification sent for user ${event.userId}`
				)
			},
			'tenant.created',
			event
		)
	}

	/**
	 * Handle tenant invitation events
	 */
	@OnEvent('tenant.invited')
	async handleTenantInvited(event: TenantInvitedEventPayload) {
		this.logger.log(
			`Processing tenant invited event for owner ${event.ownerId}`,
			{
				tenantId: event.tenantId,
				leaseId: event.leaseId
			}
		)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const client = this.supabaseService.getAdminClient()

				const [tenantResult, leaseResult] = await Promise.all([
					client
						.from('tenant')
						.select('id, firstName, lastName, email')
						.eq('id', event.tenantId)
						.single(),
					client
						.from('lease')
						.select(
							`
							id,
							propertyId,
							unitId,
							property:propertyId(name),
							unit:unitId(unitNumber)
						`
						)
						.eq('id', event.leaseId)
						.single()
				])

				if (tenantResult.error) {
					throw tenantResult.error
				}

				if (leaseResult.error) {
					throw leaseResult.error
				}

				const tenant = tenantResult.data
				const lease = leaseResult.data

				const tenantNameParts = [tenant?.firstName, tenant?.lastName].filter(
					(part): part is string => Boolean(part && part.trim())
				)
				const tenantName =
					tenantNameParts.length > 0
						? tenantNameParts.join(' ')
						: (tenant?.email ?? 'New tenant')

				const propertyName = lease?.property?.name ?? 'their property'
				const unitNumber = lease?.unit?.unitNumber ?? null
				const leaseLabel = `${propertyName}${
					unitNumber ? ` - Unit ${unitNumber}` : ''
				}`

				const metadata: Record<string, string | null> = {
					checkoutUrl: event.checkoutUrl,
					tenantId: event.tenantId,
					leaseId: event.leaseId,
					propertyName,
					tenantName
				}

				if (unitNumber) {
					metadata.unitNumber = unitNumber
				}

				const { error } = await client.from('notifications').insert({
					userId: event.ownerId,
					tenantId: tenant?.id ?? event.tenantId,
					leaseId: lease?.id ?? event.leaseId,
					propertyId: lease?.propertyId ?? null,
					title: 'Tenant Invitation Sent',
					content: `Invitation sent to ${tenantName} for ${leaseLabel}. Payment setup link ready.`,
					type: 'system',
					priority: 'low',
					actionUrl: '/tenants',
					metadata,
					isRead: false
				})

				if (error) {
					throw error
				}

				this.logger.log(
					`Tenant invitation notification stored for owner ${event.ownerId}`,
					{
						tenantId: event.tenantId,
						leaseId: event.leaseId
					}
				)
			},
			'tenant.invited',
			event
		)
	}

	/**
	 * Handle lease expiring events
	 */
	@OnEvent('lease.expiring')
	async handleLeaseExpiring(event: LeaseExpiringEvent) {
		this.logger.log(
			`Processing lease expiring event for user ${event.userId}`,
			{
				tenantName: event.tenantName,
				daysUntilExpiry: event.daysUntilExpiry
			}
		)

		const priority = event.daysUntilExpiry <= 7 ? 'HIGH' : 'MEDIUM'

		//Retry with exponential backoff instead of silent failure
		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createSystemNotification(
					event.userId,
					'Lease Expiring Soon',
					`Lease for ${event.tenantName} at ${event.propertyName} - Unit ${event.unitNumber} expires in ${event.daysUntilExpiry} days`,
					priority,
					'/leases'
				)

				this.logger.log(
					`Lease expiring notification sent for user ${event.userId}`
				)
			},
			'lease.expiring',
			event
		)
	}

	// ==================
	// HELPER METHODS FOR EVENT HANDLERS
	// ==================

	/**
	 * Create payment notification
	 */
	private async createPaymentNotification(
		userId: string,
		title: string,
		message: string,
		priority: Priority,
		propertyName: string,
		unitNumber: string,
		paymentId?: string,
		actionUrl?: string
	): Promise<void> {
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.insert({
				userId,
				title,
				content: message,
				type: 'payment',
				priority: priority.toLowerCase(),
				metadata: {
					actionUrl: actionUrl || '/billing',
					paymentId,
					propertyName,
					unitNumber
				},
				isRead: false
			})

		if (error) {
			throw error
		}
	}

	/**
	 * Create system notification
	 */
	private async createSystemNotification(
		userId: string,
		title: string,
		message: string,
		priority: Priority,
		actionUrl?: string
	): Promise<void> {
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.insert({
				userId,
				title,
				content: message,
				type: 'system',
				priority: priority.toLowerCase(),
				metadata: {
					actionUrl: actionUrl || '/manage'
				},
				isRead: false
			})

		if (error) {
			throw error
		}
	}
}
