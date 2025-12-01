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
import { AppConfigService } from '../../config/app-config.service'
import { FailedNotificationsService } from './failed-notifications.service'
import { EmailService } from '../email/email.service'
import type {
	LeaseExpiringEvent,
	MaintenanceUpdatedEvent,
	PaymentFailedEvent,
	PaymentReceivedEvent,
	TenantCreatedEvent
} from './events/notification.events'

type NotificationType = 'maintenance' | 'leases' | 'payment' | 'system'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface TenantInvitedEventPayload {
	tenant_id: string
	lease_id: string
	owner_id: string
	checkoutUrl: string
}

/**
 * Event payload from tenant-invitation.service.ts
 */
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
		private readonly config: AppConfigService,
		private readonly emailService: EmailService
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
				unit_number: requiredString,
				description: z.string().max(200, 'Description too long'),
				requestTitle: requiredString
			})
		}),

		notificationInput: z.object({
			owner_id: uuidSchema,
			title: requiredTitle,
			description: requiredDescription,
			priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
			propertyName: requiredString,
			unit_number: requiredString,
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
		owner_id: string,
		title: string,
		description: string,
		priority: Priority,
		propertyName: string,
		unit_number: string,
		maintenanceId?: string,
		actionUrl?: string
	): Promise<MaintenanceNotificationData> {
		// Validate input data using Zod directly (no wrapper abstractions)
		const validationResult =
			NotificationsService.NOTIFICATION_SCHEMAS.notificationInput.safeParse({
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

		const priorityLabel = this.getPriorityLabel(priority)

		const notification = {
			recipientId: owner_id,
			title: `${priorityLabel} Maintenance Request`,
			message: `New maintenance request for ${propertyName} - Unit ${unit_number}: ${title}`,
			type: this.getNotificationType(priority, true),
			priority: priority,
			actionUrl: actionUrl ?? '/maintenance',
			maintenanceId: maintenanceId || '',
			unit_id: '', // Will be populated when we have the actual unit ID
			category: 'GENERAL', // Default category
			data: {
				propertyName,
				unit_number,
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
									!this.config.isProduction() && error instanceof Error
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

		this.logger.log(
			{
				notification: {
					id: notificationId,
					user_id,
					action: 'cancelled'
				}
			},
			`Notification ${notificationId} cancelled for user ${user_id}`
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
			.lt('created_at', cutoffDate.toISOString())
			.eq('is_read', true)

		if (error) {
			throw error
		}
	}

	/**
	 * Get unread notification count - replaces get_unread_notification_count function
	 * Uses direct table query instead of database function
	 */
	async getUnreadCount(user_id: string): Promise<number> {
		try {
			this.logger.log('Getting unread notification count via direct query', {
				user_id
			})

			// Type assertion needed due to Supabase generated types limitation
			// When using head: true with count: 'exact', TypeScript doesn't infer count field
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
	 * Mark all notifications as read - replaces mark_all_notifications_read function
	 * Uses direct table update instead of database function
	 */
	async markAllAsRead(user_id: string): Promise<number> {
		try {
			this.logger.log('Marking all notifications as read via direct query', {
				user_id
			})

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

	// ==================
	// NATIVE EVENT LISTENERS - No Custom Abstractions
	// ==================

	/**
	 * Handle maintenance update events
	 */
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

		//Retry with exponential backoff instead of silent failure
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

	/**
	 * Handle payment received events
	 */
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

		//Retry with exponential backoff instead of silent failure
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

	/**
	 * Handle payment failed events
	 */
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

		//Retry with exponential backoff instead of silent failure
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

	/**
	 * Handle tenant created events
	 */
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

		//Retry with exponential backoff instead of silent failure
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

	/**
	 * Handle tenant invitation events
	 */
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

				const metadata: Record<string, string | null> = {
					checkoutUrl: event.checkoutUrl,
					tenant_id: event.tenant_id,
					lease_id: event.lease_id,
					propertyName,
					tenantName
				}

				if (unit_number) {
					metadata.unit_number = unit_number
				}

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


	/**
	 * Handle tenant invitation sent events - SENDS EMAIL TO TENANT
	 * This is triggered when a property owner invites a tenant and sends the actual invitation email
	 */
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
				// Fetch property/unit info for the email
				const client = this.supabaseService.getAdminClient()
				
				// Get tenant invitation details to find unit and property info
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

					// Get owner name separately
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

				// Send the actual invitation email to the tenant
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

	// ============================================================
	// LEASE SIGNATURE WORKFLOW EVENT HANDLERS
	// ============================================================

	/**
	 * Handle lease sent for signature event - notify tenant
	 */
	@OnEvent('lease.sent_for_signature')
	async handleLeaseSentForSignature(event: { lease_id: string; tenant_id: string; message?: string }) {
		this.logger.log('Processing lease.sent_for_signature event', { lease_id: event.lease_id })

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const client = this.supabaseService.getAdminClient()

				// Get lease with tenant and property info
				const { data: lease } = await client
					.from('leases')
					.select(`
						id,
						property_owner_id,
						primary_tenant_id,
						unit:unit_id(
							unit_number,
							property:property_id(name)
						)
					`)
					.eq('id', event.lease_id)
					.single()

				if (!lease) return

				// Get tenant user info
				const { data: tenant } = await client
					.from('tenants')
					.select('user_id')
					.eq('id', lease.primary_tenant_id)
					.single()

				if (!tenant) return

				const { data: tenantUser } = await client
					.from('users')
					.select('email, first_name, last_name')
					.eq('id', tenant.user_id)
					.single()

				if (!tenantUser?.email) {
					this.logger.warn('Skipping lease sent notification: tenant email missing', {
						leaseId: event.lease_id,
						tenantId: lease.primary_tenant_id
					})
					return
				}

				// Get owner name
				let ownerName: string | undefined
				if (lease.property_owner_id) {
					const { data: owner } = await client
						.from('users')
						.select('first_name, last_name')
						.eq('id', lease.property_owner_id)
						.single()
					if (owner?.first_name) {
						ownerName = `${owner.first_name} ${owner.last_name || ''}`.trim()
					}
				}

				const tenantName = tenantUser.first_name
					? `${tenantUser.first_name} ${tenantUser.last_name || ''}`.trim()
					: 'Tenant'

				const frontendUrl = this.config.getFrontendUrl()
				const signUrl = `${frontendUrl}/portal/lease`

				// Build params conditionally to satisfy exactOptionalPropertyTypes
				const emailParams: {
					tenantEmail: string
					tenantName: string
					signUrl: string
					propertyName?: string
					unitNumber?: string
					ownerName?: string
					message?: string
				} = {
					tenantEmail: tenantUser.email,
					tenantName,
					signUrl
				}
				if (lease.unit?.property?.name) {
					emailParams.propertyName = lease.unit.property.name
				}
				if (lease.unit?.unit_number) {
					emailParams.unitNumber = lease.unit.unit_number
				}
				if (ownerName) {
					emailParams.ownerName = ownerName
				}
				if (event.message) {
					emailParams.message = event.message
				}

				// Send email notification
				await this.emailService.sendLeaseSentForSignatureEmail(emailParams)

				// Create in-app notification
				await this.createSystemNotification(
					tenant.user_id,
					'Lease Ready for Signature',
					`Your lease is ready for review and signature. Please sign to complete the agreement.`,
					'/portal/lease'
				)

				this.logger.log('Lease sent for signature notification sent', { lease_id: event.lease_id })
			},
			'lease.sent_for_signature',
			event
		)
	}

	/**
	 * Handle owner signed event - notify tenant
	 */
	@OnEvent('lease.owner_signed')
	async handleLeaseOwnerSigned(event: { lease_id: string; signed_at: string }) {
		this.logger.log('Processing lease.owner_signed event', { lease_id: event.lease_id })

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const client = this.supabaseService.getAdminClient()

				// Get lease with full info
				const { data: lease } = await client
					.from('leases')
					.select(`
						id,
						property_owner_id,
						primary_tenant_id,
						tenant_signed_at,
						unit:unit_id(
							unit_number,
							property:property_id(name)
						)
					`)
					.eq('id', event.lease_id)
					.single()

				if (!lease) return

				// Get tenant user info
				const { data: tenant } = await client
					.from('tenants')
					.select('user_id')
					.eq('id', lease.primary_tenant_id)
					.single()

				if (!tenant) return

				const { data: tenantUser } = await client
					.from('users')
					.select('email, first_name, last_name')
					.eq('id', tenant.user_id)
					.single()

				if (!tenantUser?.email) {
					this.logger.warn('Skipping owner signed notification: tenant email missing', {
						leaseId: event.lease_id,
						tenantId: lease.primary_tenant_id
					})
					return
				}

				// Get owner name
				let ownerName: string | undefined
				if (lease.property_owner_id) {
					const { data: owner } = await client
						.from('users')
						.select('first_name, last_name')
						.eq('id', lease.property_owner_id)
						.single()
					if (owner?.first_name) {
						ownerName = `${owner.first_name} ${owner.last_name || ''}`.trim()
					}
				}

				const tenantName = tenantUser.first_name
					? `${tenantUser.first_name} ${tenantUser.last_name || ''}`.trim()
					: 'Tenant'

				const frontendUrl = this.config.getFrontendUrl()
				const signUrl = `${frontendUrl}/portal/lease`
				const tenantHasSigned = !!lease.tenant_signed_at

				// Build params conditionally to satisfy exactOptionalPropertyTypes
				const ownerSignedParams: {
					tenantEmail: string
					tenantName: string
					signedAt: string
					signUrl: string
					tenantHasSigned: boolean
					ownerName?: string
					propertyName?: string
				} = {
					tenantEmail: tenantUser.email,
					tenantName,
					signedAt: event.signed_at,
					signUrl,
					tenantHasSigned
				}
				if (ownerName) {
					ownerSignedParams.ownerName = ownerName
				}
				if (lease.unit?.property?.name) {
					ownerSignedParams.propertyName = lease.unit.property.name
				}

				// Send email notification
				await this.emailService.sendOwnerSignedEmail(ownerSignedParams)

				// Create in-app notification
				const notificationMessage = tenantHasSigned
					? 'Your lease is now active! Both parties have signed.'
					: 'Your landlord has signed the lease. Please sign to activate your lease.'

				await this.createSystemNotification(
					tenant.user_id,
					tenantHasSigned ? 'Lease Activated' : 'Owner Has Signed',
					notificationMessage,
					'/portal/lease'
				)

				this.logger.log('Owner signed notification sent', { lease_id: event.lease_id })
			},
			'lease.owner_signed',
			event
		)
	}

	/**
	 * Handle tenant signed event - notify owner
	 */
	@OnEvent('lease.tenant_signed')
	async handleLeaseTenantSigned(event: { lease_id: string; tenant_id: string; signed_at: string }) {
		this.logger.log('Processing lease.tenant_signed event', { lease_id: event.lease_id })

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const client = this.supabaseService.getAdminClient()

				// Get lease with full info
				const { data: lease } = await client
					.from('leases')
					.select(`
						id,
						property_owner_id,
						primary_tenant_id,
						owner_signed_at,
						unit:unit_id(
							unit_number,
							property:property_id(name)
						)
					`)
					.eq('id', event.lease_id)
					.single()

				if (!lease || !lease.property_owner_id) return

				// Get owner info
				const { data: owner } = await client
					.from('users')
					.select('email, first_name, last_name')
					.eq('id', lease.property_owner_id)
					.single()

				if (!owner?.email) {
					this.logger.warn('Skipping tenant signed notification: owner email missing', {
						leaseId: event.lease_id,
						ownerId: lease.property_owner_id
					})
					return
				}

				// Get tenant name
				const { data: tenant } = await client
					.from('tenants')
					.select('user_id')
					.eq('id', lease.primary_tenant_id)
					.single()

				let tenantName = 'Tenant'
				if (tenant) {
					const { data: tenantUser } = await client
						.from('users')
						.select('first_name, last_name')
						.eq('id', tenant.user_id)
						.single()
					if (tenantUser?.first_name) {
						tenantName = `${tenantUser.first_name} ${tenantUser.last_name || ''}`.trim()
					}
				}

				const ownerName = owner.first_name
					? `${owner.first_name} ${owner.last_name || ''}`.trim()
					: 'Property Owner'

				const frontendUrl = this.config.getFrontendUrl()
				const dashboardUrl = `${frontendUrl}/leases/${event.lease_id}`
				const ownerHasSigned = !!lease.owner_signed_at

				// Send email notification
				await this.emailService.sendTenantSignedEmail({
					ownerEmail: owner.email,
					ownerName,
					tenantName,
					propertyName: lease.unit?.property?.name,
					signedAt: event.signed_at,
					dashboardUrl,
					ownerHasSigned
				})

				// Create in-app notification
				const notificationMessage = ownerHasSigned
					? `Lease activated! ${tenantName} has signed the lease.`
					: `${tenantName} has signed the lease. Your signature is needed to activate.`

				await this.createSystemNotification(
					lease.property_owner_id,
					ownerHasSigned ? 'Lease Activated' : 'Tenant Has Signed',
					notificationMessage,
					`/leases/${event.lease_id}`
				)

				this.logger.log('Tenant signed notification sent', { lease_id: event.lease_id })
			},
			'lease.tenant_signed',
			event
		)
	}

	/**
	 * Handle lease activated event - notify both parties
	 */
	@OnEvent('lease.activated')
	async handleLeaseActivated(event: { lease_id: string; tenant_id: string; subscription_id: string }) {
		this.logger.log('Processing lease.activated event', { lease_id: event.lease_id })

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const client = this.supabaseService.getAdminClient()

				// Get full lease info
				const { data: lease } = await client
					.from('leases')
					.select(`
						id,
						property_owner_id,
						primary_tenant_id,
						rent_amount,
						rent_currency,
						start_date,
						unit:unit_id(
							unit_number,
							property:property_id(name)
						)
					`)
					.eq('id', event.lease_id)
					.single()

				if (!lease || !lease.property_owner_id) return

				const frontendUrl = this.config.getFrontendUrl()
				const propertyName = lease.unit?.property?.name

				// Send to owner
				const { data: owner } = await client
					.from('users')
					.select('email, first_name, last_name')
					.eq('id', lease.property_owner_id)
					.single()

				if (owner?.email) {
					const ownerName = owner.first_name
						? `${owner.first_name} ${owner.last_name || ''}`.trim()
						: 'Property Owner'

					await this.emailService.sendLeaseActivatedEmail({
						recipientEmail: owner.email,
						recipientName: ownerName,
						isOwner: true,
						propertyName,
						rentAmount: lease.rent_amount,
						rentCurrency: lease.rent_currency || 'USD',
						startDate: lease.start_date,
						portalUrl: `${frontendUrl}/leases/${event.lease_id}`
					})
				} else {
					this.logger.warn('Skipping lease activated notification for owner: email missing', {
						leaseId: event.lease_id,
						ownerId: lease.property_owner_id
					})
				}

				// Send to tenant
				const { data: tenant } = await client
					.from('tenants')
					.select('user_id')
					.eq('id', lease.primary_tenant_id)
					.single()

				if (tenant) {
					const { data: tenantUser } = await client
						.from('users')
						.select('email, first_name, last_name')
						.eq('id', tenant.user_id)
						.single()

					if (tenantUser?.email) {
						const tenantName = tenantUser.first_name
							? `${tenantUser.first_name} ${tenantUser.last_name || ''}`.trim()
							: 'Tenant'

						await this.emailService.sendLeaseActivatedEmail({
							recipientEmail: tenantUser.email,
							recipientName: tenantName,
							isOwner: false,
							propertyName,
							rentAmount: lease.rent_amount,
							rentCurrency: lease.rent_currency || 'USD',
							startDate: lease.start_date,
							portalUrl: `${frontendUrl}/portal`
						})
					} else {
						this.logger.warn('Skipping lease activated notification for tenant: email missing', {
							leaseId: event.lease_id,
							tenantId: lease.primary_tenant_id
						})
					}
				}

				this.logger.log('Lease activated notifications sent', { lease_id: event.lease_id })
			},
			'lease.activated',
			event
		)
	}

	/**
	 * Handle lease expiring events
	 */
	@OnEvent('lease.expiring')
	async handleLeaseExpiring(event: LeaseExpiringEvent) {
		this.logger.log(
			`Processing lease expiring event for user ${event.user_id}`,
			{
				tenantName: event.tenantName,
				daysUntilExpiry: event.daysUntilExpiry
			}
		)

				// Note: Priority could be determined by daysUntilExpiry if system notifications support priority
		// const priority = event.daysUntilExpiry <= 7 ? 'HIGH' : 'MEDIUM'

		//Retry with exponential backoff instead of silent failure
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
	// HELPER METHODS FOR EVENT HANDLERS
	// ==================

	/**
	 * Create payment notification
	 */
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

	/**
	 * Create system notification
	 */
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
