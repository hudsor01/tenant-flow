/**
 * NotificationEventHandlerService
 * Handles all @OnEvent notifications
 */

import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { FailedNotificationsService } from './failed-notifications.service'
import { EmailService } from '../email/email.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	MaintenanceUpdatedEvent,
	PaymentReceivedEvent,
	PaymentFailedEvent,
	TenantCreatedEvent,
	LeaseExpiringEvent
} from './events/notification.events'

const PRIORITY_LABELS: Record<string, string> = {
	URGENT: 'Urgent',
	HIGH: 'High Priority',
	MEDIUM: 'Medium Priority',
	LOW: 'Low Priority'
}

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

interface TenantPlatformInvitationSentPayload {
	email: string
	first_name?: string
	last_name?: string
	invitation_id: string
	invitation_url: string
	expires_at: string
	property_id?: string
	unit_id?: string
}

@Injectable()
export class NotificationEventHandlerService {

	constructor(private readonly supabaseService: SupabaseService,
		private readonly failedNotifications: FailedNotificationsService,
		private readonly emailService: EmailService, private readonly logger: AppLogger) {}

	@OnEvent('maintenance.updated')
	async handleMaintenanceUpdated(event: MaintenanceUpdatedEvent) {
		this.logger.log(`Processing maintenance.updated for user ${event.user_id}`)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const priorityLabel = PRIORITY_LABELS[event.priority] || event.priority

				await this.insertNotification({
					user_id: event.user_id,
					title: `${priorityLabel} Maintenance Request`,
					message: `Maintenance request for ${event.propertyName} - Unit ${event.unit_number}: ${event.title}`,
					notification_type: `maintenance_${event.priority.toLowerCase()}`,
					action_url: '/maintenance',
					entity_id: event.maintenanceId,
					entity_type: 'maintenance'
				})
			},
			'maintenance.updated',
			event
		)
	}

	@OnEvent('payment.received')
	async handlePaymentReceived(event: PaymentReceivedEvent) {
		this.logger.log(`Processing payment.received for user ${event.user_id}`)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.insertNotification({
					user_id: event.user_id,
					title: 'Payment Received',
					message: event.description,
					notification_type: 'payment',
					action_url: '/billing',
					entity_id: event.subscriptionId,
					entity_type: 'payment'
				})
			},
			'payment.received',
			event
		)
	}

	@OnEvent('payment.failed')
	async handlePaymentFailed(event: PaymentFailedEvent) {
		this.logger.log(`Processing payment.failed for user ${event.user_id}`)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.insertNotification({
					user_id: event.user_id,
					title: 'Payment Failed',
					message: event.reason,
					notification_type: 'payment',
					action_url: '/billing/payment-methods',
					entity_id: event.subscriptionId,
					entity_type: 'payment'
				})
			},
			'payment.failed',
			event
		)
	}

	@OnEvent('tenant.created')
	async handleTenantCreated(event: TenantCreatedEvent) {
		this.logger.log(`Processing tenant.created for user ${event.user_id}`)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.insertNotification({
					user_id: event.user_id,
					title: 'New Tenant Added',
					message: event.description,
					notification_type: 'system',
					action_url: '/tenants'
				})
			},
			'tenant.created',
			event
		)
	}

	@OnEvent('lease.expiring')
	async handleLeaseExpiring(event: LeaseExpiringEvent) {
		this.logger.log(`Processing lease.expiring for user ${event.user_id}`)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				await this.insertNotification({
					user_id: event.user_id,
					title: 'Lease Expiring Soon',
					message: `Lease for ${event.tenantName} at ${event.propertyName} - Unit ${event.unit_number} expires in ${event.daysUntilExpiry} days`,
					notification_type: 'system',
					action_url: '/leases'
				})
			},
			'lease.expiring',
			event
		)
	}

	@OnEvent('tenant.invited')
	async handleTenantInvited(event: TenantInvitedEventPayload) {
		this.logger.log(`Processing tenant.invited for owner ${event.owner_id}`)

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
						.select(`
							id,
							unit_id,
							unit:unit_id(unit_number, property_id, property:property_id(name))
						`)
						.eq('id', event.lease_id)
						.single()
				])

				if (tenantResult.error) throw tenantResult.error
				if (leaseResult.error) throw leaseResult.error

				const tenant = tenantResult.data
				const lease = leaseResult.data

				const tenantNameParts = [tenant?.user?.first_name, tenant?.user?.last_name].filter(
					(part): part is string => Boolean(part && part.trim())
				)
				const tenantName = tenantNameParts.length > 0
					? tenantNameParts.join(' ')
					: (tenant?.user?.email ?? 'New tenant')

				const propertyName = lease?.unit?.property?.name ?? 'their property'
				const unit_number = lease?.unit?.unit_number ?? null
				const leaseLabel = `${propertyName}${unit_number ? ` - Unit ${unit_number}` : ''}`

				await this.insertNotification({
					user_id: event.owner_id,
					title: 'Tenant Invitation Sent',
					message: `Invitation sent to ${tenantName} for ${leaseLabel}. Payment setup link ready.`,
					notification_type: 'system',
					action_url: '/tenants',
					entity_id: event.tenant_id,
					entity_type: 'tenant_invitation'
				})
			},
			'tenant.invited',
			event
		)
	}

	@OnEvent('tenant.invitation.sent')
	async handleTenantInvitationSent(event: TenantInvitationSentEventPayload) {
		this.logger.log(`Processing tenant.invitation.sent for ${event.email}`)

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
						owner:property_owner_id(
							user_id,
							user:user_id(first_name, last_name)
						),
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
					this.logger.warn('Could not fetch invitation details', { error: invError.message })
				} else if (invitation) {
					propertyName = invitation.unit?.property?.name ?? undefined
					unitNumber = invitation.unit?.unit_number ?? undefined

					const ownerUser = invitation.owner?.user as { first_name: string | null; last_name: string | null } | null
					if (ownerUser?.first_name && ownerUser?.last_name) {
						ownerName = `${ownerUser.first_name} ${ownerUser.last_name}`
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
			},
			'tenant.invitation.sent',
			event
		)
	}

	@OnEvent('tenant.platform_invitation.sent')
	async handleTenantPlatformInvitationSent(event: TenantPlatformInvitationSentPayload) {
		this.logger.log(`Processing tenant.platform_invitation.sent for ${event.email}`)

		await this.failedNotifications.retryWithBackoff(
			async () => {
				const client = this.supabaseService.getAdminClient()

				let propertyName: string | undefined
				let unitNumber: string | undefined
				let ownerName: string | undefined

				// Fetch property details if property_id provided
				if (event.property_id) {
					const { data: property } = await client
						.from('properties')
						.select(`
							name,
							property_owner_id,
							owner:property_owner_id(
								user_id,
								user:user_id(first_name, last_name)
							)
						`)
						.eq('id', event.property_id)
						.single()

					if (property) {
						propertyName = property.name ?? undefined
						const ownerUser = property.owner?.user as { first_name: string | null; last_name: string | null } | null
						if (ownerUser?.first_name && ownerUser?.last_name) {
							ownerName = `${ownerUser.first_name} ${ownerUser.last_name}`
						}
					}
				}

				// Fetch unit details if unit_id provided
				if (event.unit_id) {
					const { data: unit } = await client
						.from('units')
						.select('unit_number')
						.eq('id', event.unit_id)
						.single()

					if (unit) {
						unitNumber = unit.unit_number ?? undefined
					}
				}

				await this.emailService.sendTenantInvitationEmail({
					tenantEmail: event.email,
					invitationUrl: event.invitation_url,
					expiresAt: event.expires_at,
					...(propertyName && { propertyName }),
					...(unitNumber && { unitNumber }),
					...(ownerName && { ownerName })
				})
			},
			'tenant.platform_invitation.sent',
			event
		)
	}

	/**
	 * Insert notification record - private helper
	 */
	private async insertNotification(params: {
		user_id: string
		title: string
		message: string
		notification_type: string
		action_url: string
		entity_id?: string
		entity_type?: string
	}): Promise<void> {
		const insertData: {
			user_id: string
			title: string
			message: string
			notification_type: string
			action_url: string
			is_read: boolean
			entity_id?: string
			entity_type?: string
		} = {
			user_id: params.user_id,
			title: params.title,
			message: params.message,
			notification_type: params.notification_type,
			action_url: params.action_url,
			is_read: false
		}

		if (params.entity_id) insertData.entity_id = params.entity_id
		if (params.entity_type) insertData.entity_type = params.entity_type

		const { error } = await this.supabaseService
			.getAdminClient()
			.from('notifications')
			.insert(insertData)

		if (error) throw error
	}
}