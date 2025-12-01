/**
 * Notifications Service (Facade)
 * Handles notification creation and event handling
 * Delegates query operations to NotificationQueryService
 * Delegates formatting to NotificationFormatterService
 *
 * Decomposed Services:
 * - NotificationQueryService: CRUD operations and queries
 * - NotificationFormatterService: Priority formatting and type mapping
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import type { MaintenanceNotificationData } from '@repo/shared/types/notifications'
import type { Database } from '@repo/shared/types/supabase'
import {
	requiredDescription,
	requiredString,
	requiredTitle,
	uuidSchema
} from '@repo/shared/validation/common'
import { z } from 'zod'
import { SupabaseService } from '../../database/supabase.service'
import { FailedNotificationsService } from './failed-notifications.service'
import { NotificationQueryService } from './notification-query.service'
import { NotificationFormatterService } from './notification-formatter.service'
import { EmailService } from '../email/email.service'
import {
	LeaseExpiringEvent,
	MaintenanceUpdatedEvent,
	PaymentFailedEvent,
	PaymentReceivedEvent,
	TenantCreatedEvent
} from './events/notification.events'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface TenantInvitedEventPayload {
	tenant_id: string
	lease_id: string
	owner_id: string
	checkoutUrl: string
}

interface TenantInvitationSentEventPayload {
	email: string
	tenant_id: string
	invitationCode: string
	invitationUrl: string
	expiresAt: string
}

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly failedNotifications: FailedNotificationsService,
		private readonly emailService: EmailService,
		private readonly queryService: NotificationQueryService,
		private readonly formatterService: NotificationFormatterService
	) {}

	/**
	 * Zod schema for maintenance notification input validation
	 * Validates at API boundary - trusted downstream per Zod best practices
	 */
	private static readonly maintenanceInputSchema = z.object({
		owner_id: uuidSchema,
		title: requiredTitle,
		description: requiredDescription,
		priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
		propertyName: requiredString,
		unit_number: requiredString,
		maintenanceId: uuidSchema.optional(),
		actionUrl: z.string().url('Invalid URL format').optional()
	})

	// ==================
	// DELEGATED TO QUERY SERVICE
	// ==================

	async getUnreadNotifications(
		user_id: string
	): Promise<Database['public']['Tables']['notifications']['Row'][]> {
		return this.queryService.getUnreadNotifications(user_id)
	}

	async markAsRead(
		notificationId: string,
		user_id: string
	): Promise<Database['public']['Tables']['notifications']['Row']> {
		return this.queryService.markAsRead(notificationId, user_id)
	}

	async getUnreadCount(user_id: string): Promise<number> {
		return this.queryService.getUnreadCount(user_id)
	}

	async markAllAsRead(user_id: string): Promise<number> {
		return this.queryService.markAllAsRead(user_id)
	}

	async cancelNotification(
		notificationId: string,
		user_id: string
	): Promise<Database['public']['Tables']['notifications']['Row']> {
		return this.queryService.cancelNotification(notificationId, user_id)
	}

	async cleanupOldNotifications(daysToKeep = 30): Promise<void> {
		return this.queryService.cleanupOldNotifications(daysToKeep)
	}

	// ==================
	// DELEGATED TO FORMATTER SERVICE
	// ==================

	getNotificationType(
		priority: Priority,
		isNewRequest = false
	): string {
		return this.formatterService.getNotificationType(priority, isNewRequest)
	}

	getPriorityLabel(priority: Priority): string {
		return this.formatterService.getPriorityLabel(priority)
	}

	getNotificationUrgency(priority: Priority): boolean {
		return this.formatterService.getNotificationUrgency(priority)
	}

	getNotificationTimeout(priority: Priority): number {
		return this.formatterService.getNotificationTimeout(priority)
	}

	shouldSendImmediately(priority: Priority): boolean {
		return this.formatterService.shouldSendImmediately(priority)
	}

	// ==================
	// NOTIFICATION CREATION (Remaining in Facade)
	// ==================

	async createMaintenanceNotification(
		owner_id: string,
		title: string,
		description: string,
		priority: Priority,
		propertyName: string,
		unit_number: string,
		maintenanceId?: string,
		actionUrl?: string
	): Promise<MaintenanceNotificationData> {
		const validationResult =
			NotificationsService.maintenanceInputSchema.safeParse({
				owner_id,
				title,
				description,
				priority,
				propertyName,
				unit_number,
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

		const priorityLabel = this.formatterService.getPriorityLabel(priority)

		// Build notification from validated input - no need for second validation
		// since all fields come from already-validated data
		const notification = {
			recipientId: owner_id,
			title: `${priorityLabel} Maintenance Request`,
			message: `New maintenance request for ${propertyName} - Unit ${unit_number}: ${title}`,
			type: this.formatterService.getNotificationType(priority, true),
			priority: priority,
			actionUrl: actionUrl ?? '/maintenance',
			maintenanceId: maintenanceId || '',
			data: {
				propertyName,
				unit_number,
				description: description.substring(0, 200),
				requestTitle: title
			}
		}

		const { error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.insert({
				user_id: notification.recipientId,
				title: notification.title,
				message: notification.message,
				notification_type: notification.type,
				entity_id: notification.maintenanceId,
				entity_type: 'maintenance',
				action_url: notification.actionUrl,
				is_read: false
			})
			.select()
			.single()

		if (error) {
			throw error
		}

		if (this.formatterService.shouldSendImmediately(priority)) {
			await this.sendImmediateNotification(notification)
		}

		return notification as unknown as MaintenanceNotificationData
	}

	/**
	 * Placeholder for immediate notification delivery (email disabled for MVP)
	 * TODO: Implement email delivery when ready to enable
	 */
	private async sendImmediateNotification(notification: {
		recipientId: string
		type: string
		title: string
	}): Promise<void> {
		this.logger.log(
			`High-priority notification queued for ${notification.recipientId} (email disabled for MVP)`,
			{ type: notification.type, title: notification.title }
		)
	}

	// ==================
	// EVENT HANDLERS
	// ==================

	@OnEvent('maintenance.updated')
	async handleMaintenanceUpdated(event: MaintenanceUpdatedEvent) {
		this.logger.log(
			`Processing maintenance updated event for user ${event.user_id}`,
			{
				maintenanceId: event.maintenanceId,
				priority: event.priority,
				status: event.status
			}
		)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createMaintenanceNotification(
					event.user_id,
					event.title,
					event.description,
					event.priority,
					event.propertyName,
					event.unit_number,
					event.maintenanceId
				)

				this.logger.log(
					`Maintenance notification created for user ${event.user_id}`
				)
			},
			'maintenance.updated',
			event
		)
	}

	@OnEvent('payment.received')
	async handlePaymentReceived(event: PaymentReceivedEvent) {
		this.logger.log(
			`Processing payment received event for user ${event.user_id}`,
			{
				subscriptionId: event.subscriptionId,
				amount: event.amount,
				currency: event.currency
			}
		)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createPaymentNotification(
					event.user_id,
					'Payment Received',
					event.description,
					event.subscriptionId
				)

				this.logger.log(`Payment notification created for user ${event.user_id}`)
			},
			'payment.received',
			event
		)
	}

	@OnEvent('payment.failed')
	async handlePaymentFailed(event: PaymentFailedEvent) {
		this.logger.log(
			`Processing payment failed event for user ${event.user_id}`,
			{
				amount: event.amount,
				reason: event.reason,
				currency: event.currency
			}
		)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createPaymentNotification(
					event.user_id,
					'Payment Failed',
					event.reason,
					event.subscriptionId,
					'/billing/payment-methods'
				)

				this.logger.log(
					`Payment failed notification created for user ${event.user_id}`
				)
			},
			'payment.failed',
			event
		)
	}

	@OnEvent('tenant.created')
	async handleTenantCreated(event: TenantCreatedEvent) {
		this.logger.log(
			`Processing tenant created event for user ${event.user_id}`,
			{
				tenantName: event.tenantName,
				tenantEmail: event.tenantEmail,
				tenant_id: event.tenant_id
			}
		)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createSystemNotification(
					event.user_id,
					'New Tenant Added',
					event.description,
					'/tenants'
				)

				this.logger.log(
					`Tenant created notification sent for user ${event.user_id}`
				)
			},
			'tenant.created',
			event
		)
	}

	@OnEvent('tenant.invited')
	async handleTenantInvited(event: TenantInvitedEventPayload) {
		this.logger.log(
			`Processing tenant invited event for owner ${event.owner_id}`,
			{
				tenant_id: event.tenant_id,
				lease_id: event.lease_id
			}
		)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const client = this.supabaseService.getAdminClient()

				const [tenantResult, leaseResult] = await Promise.all([
					client
						.from('tenants')
						.select('id, user_id, user:user_id(first_name, last_name, email)')
						.eq('id', event.tenant_id)
						.single(),
					client
						.from('leases')
						.select(
							`
							id,
							unit_id,
							unit:unit_id(unit_number, property_id, property:property_id(name))
						`
						)
						.eq('id', event.lease_id)
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

				const tenantNameParts = [tenant?.user?.first_name, tenant?.user?.last_name].filter(
					(part): part is string => Boolean(part && part.trim())
				)
				const tenantName =
					tenantNameParts.length > 0
						? tenantNameParts.join(' ')
						: (tenant?.user?.email ?? 'New tenant')

				const propertyName = lease?.unit?.property?.name ?? 'their property'
				const unit_number = lease?.unit?.unit_number ?? null
				const leaseLabel = `${propertyName}${
					unit_number ? ` - Unit ${unit_number}` : ''
				}`

				const { error } = await client.from('notifications').insert({
					user_id: event.owner_id,
					entity_id: event.tenant_id,
					entity_type: 'tenant_invitation',
					title: 'Tenant Invitation Sent',
					message: `Invitation sent to ${tenantName} for ${leaseLabel}. Payment setup link ready.`,
					notification_type: 'system',
					action_url: '/tenants',
					is_read: false
				})

				if (error) {
					throw error
				}

				this.logger.log(
					`Tenant invitation notification stored for owner ${event.owner_id}`,
					{
						tenant_id: event.tenant_id,
						lease_id: event.lease_id
					}
				)
			},
			'tenant.invited',
			event
		)
	}

	@OnEvent('tenant.invitation.sent')
	async handleTenantInvitationSent(event: TenantInvitationSentEventPayload) {
		this.logger.log(
			`Processing tenant.invitation.sent event for ${event.email}`,
			{
				tenant_id: event.tenant_id,
				invitationUrl: event.invitationUrl
			}
		)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const client = this.supabaseService.getAdminClient()

				const { data: invitation, error: invError } = await client
					.from('tenant_invitations')
					.select(`
						id,
						email,
						unit_id,
						property_owner_id,
						unit:unit_id(
							unit_number,
							property_id,
							property:property_id(name)
						)
					`)
					.eq('invitation_code', event.invitationCode)
					.single()

				let propertyName: string | undefined
				let unitNumber: string | undefined
				let ownerName: string | undefined

				if (invError) {
					this.logger.warn('Could not fetch invitation details for email', {
						error: invError.message,
						invitationCode: event.invitationCode.substring(0, 8) + '...'
					})
				} else if (invitation) {
					propertyName = invitation.unit?.property?.name ?? undefined
					unitNumber = invitation.unit?.unit_number ?? undefined

					if (invitation.property_owner_id) {
						const { data: owner } = await client
							.from('users')
							.select('first_name, last_name')
							.eq('id', invitation.property_owner_id)
							.single()

						if (owner?.first_name && owner?.last_name) {
							ownerName = `${owner.first_name} ${owner.last_name}`
						}
					}
				}

				await this.emailService.sendTenantInvitationEmail({
					tenantEmail: event.email,
					invitationUrl: event.invitationUrl,
					expiresAt: event.expiresAt,
					...(propertyName && { propertyName }),
					...(unitNumber && { unitNumber }),
					...(ownerName && { ownerName })
				})

				this.logger.log(
					`Tenant invitation email sent to ${event.email}`,
					{
						tenant_id: event.tenant_id,
						propertyName,
						unitNumber
					}
				)
			},
			'tenant.invitation.sent',
			event
		)
	}

	@OnEvent('lease.expiring')
	async handleLeaseExpiring(event: LeaseExpiringEvent) {
		this.logger.log(
			`Processing lease expiring event for user ${event.user_id}`,
			{
				tenantName: event.tenantName,
				daysUntilExpiry: event.daysUntilExpiry
			}
		)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.createSystemNotification(
					event.user_id,
					'Lease Expiring Soon',
					`Lease for ${event.tenantName} at ${event.propertyName} - Unit ${event.unit_number} expires in ${event.daysUntilExpiry} days`,
					'/leases'
				)

				this.logger.log(
					`Lease expiring notification sent for user ${event.user_id}`
				)
			},
			'lease.expiring',
			event
		)
	}

	// ==================
	// PRIVATE HELPER METHODS
	// ==================

	private async createPaymentNotification(
		user_id: string,
		title: string,
		message: string,
		paymentId?: string,
		actionUrl?: string
	): Promise<void> {
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.insert({
				user_id,
				title,
				message: message,
				notification_type: 'payment',
				...(paymentId ? { entity_id: paymentId } : {}),
				entity_type: 'payment',
				action_url: actionUrl || '/billing',
				is_read: false
			})

		if (error) {
			throw error
		}
	}

	private async createSystemNotification(
		user_id: string,
		title: string,
		message: string,
		actionUrl?: string
	): Promise<void> {
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.insert({
				user_id,
				title,
				message: message,
				notification_type: 'system',
				action_url: actionUrl || '/',
				is_read: false
			})

		if (error) {
			throw error
		}
	}
}
