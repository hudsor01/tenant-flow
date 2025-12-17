/**
 * Subscription Alert Listener
 *
 * Listens for lease subscription failure events and sends alerts.
 * Alerts are sent via email and logged for monitoring.
 *
 * Events handled:
 * - lease.subscription_failed: Subscription creation failed (will be retried)
 * - lease.subscription_max_retries: Max retry attempts reached (requires manual intervention)
 */

import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { SupabaseService } from '../../../database/supabase.service'
import { EmailService } from '../../email/email.service'
import { AppConfigService } from '../../../config/app-config.service'
import { EventIdempotencyService } from '../../../shared/services/event-idempotency.service'
import { AppLogger } from '../../../logger/app-logger.service'

/** Event payload for subscription failure */
interface SubscriptionFailedEvent {
	lease_id: string
	tenant_id: string
	error: string
}

/** Event payload for max retries reached */
interface SubscriptionMaxRetriesEvent {
	lease_id: string
	owner_user_id: string
	tenant_id: string
	retry_count: number
}

@Injectable()
export class SubscriptionAlertListener {

	constructor(private readonly supabase: SupabaseService,
		private readonly emailService: EmailService,
		private readonly config: AppConfigService,
		private readonly idempotency: EventIdempotencyService, private readonly logger: AppLogger) {}

	/**
	 * Handle subscription failure event
	 * Logs the failure - actual alerting happens on max retries
	 */
	@OnEvent('lease.subscription_failed')
	async handleSubscriptionFailed(event: SubscriptionFailedEvent): Promise<void> {
		await this.idempotency.withIdempotency('lease.subscription_failed', event, async () => {
			try {
				this.logger.warn('Subscription creation failed, will retry', {
					leaseId: event.lease_id,
					tenantId: event.tenant_id,
					error: event.error
				})

				// For now, just log. Could add Slack/PagerDuty integration here.
				// The retry service will attempt to recover.
			} catch (error) {
				this.logger.error('Failed to handle subscription failed event', {
					error: error instanceof Error ? error.message : String(error),
					event
				})
			}
		})
	}

	/**
	 * Handle max retries reached event
	 * Sends alert email to admin and logs critical error
	 */
	@OnEvent('lease.subscription_max_retries')
	async handleMaxRetries(event: SubscriptionMaxRetriesEvent): Promise<void> {
		await this.idempotency.withIdempotency('lease.subscription_max_retries', event, async () => {
			try {
				this.logger.error('CRITICAL: Subscription creation max retries reached', {
					leaseId: event.lease_id,
					propertyOwnerId: event.owner_user_id,
					tenantId: event.tenant_id,
					retryCount: event.retry_count,
					action_required: 'Manual intervention required'
				})

			// Get lease details for alert
			const client = this.supabase.getAdminClient()

			const { data: lease } = await client
				.from('leases')
				.select(`
					id,
					rent_amount,
					subscription_failure_reason,
					owner:users!leases_owner_user_id_fkey (
						email,
						first_name,
						last_name
					),
					tenants!leases_primary_tenant_id_fkey (
						id,
						users!tenants_user_id_fkey (
							email,
							first_name,
							last_name
						)
					),
					units!leases_unit_id_fkey (
						unit_number,
						properties!units_property_id_fkey (
							name
						)
					)
				`)
				.eq('id', event.lease_id)
				.single()

			if (!lease) {
				this.logger.error('Could not find lease for alert', { leaseId: event.lease_id })
				return
			}

			// Extract owner email (handle nested structure)
			const ownerUser = lease.owner as { email?: string; first_name?: string; last_name?: string } | undefined
			const ownerEmail = ownerUser?.email
			const ownerName = ownerUser ? `${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() : 'Property Owner'

			// Extract tenant name
			const tenantUser = (lease.tenants as { users?: { first_name?: string; last_name?: string } })?.users
			const tenantName = tenantUser ? `${tenantUser.first_name || ''} ${tenantUser.last_name || ''}`.trim() : 'Tenant'

			// Extract property info
			const unit = lease.units as { unit_number?: string; properties?: { name?: string } } | null
			const propertyName = unit?.properties?.name || 'Unknown Property'
			const unitNumber = unit?.unit_number

			// Send alert email to owner
			if (ownerEmail) {
				await this.sendSubscriptionFailureAlertEmail({
					recipientEmail: ownerEmail,
					recipientName: ownerName,
					leaseId: event.lease_id,
					propertyName,
					...(unitNumber !== undefined && { unitNumber }),
					tenantName,
					rentAmount: (lease as { rent_amount: number }).rent_amount,
					failureReason: ((lease as { subscription_failure_reason?: string }).subscription_failure_reason) || 'Unknown error',
					retryCount: event.retry_count,
					dashboardUrl: `${this.config.getFrontendUrl()}/dashboard/leases/${event.lease_id}`
				})
			}

			// Also send to admin/support email if configured
			const supportEmail = this.config.getSupportEmail?.() || null
			if (supportEmail && supportEmail !== ownerEmail) {
				await this.sendSubscriptionFailureAlertEmail({
					recipientEmail: supportEmail,
					recipientName: 'TenantFlow Admin',
					leaseId: event.lease_id,
					propertyName,
					...(unitNumber !== undefined && { unitNumber }),
					tenantName,
					rentAmount: (lease as { rent_amount: number }).rent_amount,
					failureReason: ((lease as { subscription_failure_reason?: string }).subscription_failure_reason) || 'Unknown error',
					retryCount: event.retry_count,
					dashboardUrl: `${this.config.getFrontendUrl()}/admin/leases/${event.lease_id}`
				})
			}
		} catch (error) {
				this.logger.error('Failed to handle max retries event', {
					error: error instanceof Error ? error.message : String(error),
					event
				})
			}
		})
	}

	/**
	 * Send subscription failure alert email
	 * Simple text email for now - could be upgraded to React template
	 */
	private async sendSubscriptionFailureAlertEmail(data: {
		recipientEmail: string
		recipientName: string
		leaseId: string
		propertyName: string
		unitNumber?: string
		tenantName: string
		rentAmount: number
		failureReason: string
		retryCount: number
		dashboardUrl: string
	}): Promise<void> {
		try {
			this.logger.warn('Sending subscription failure alert email', {
				to: data.recipientEmail,
				leaseId: data.leaseId
			})

			await this.emailService.sendSubscriptionFailureAlertEmail(data)
		} catch (error) {
			this.logger.error('Failed to send subscription failure alert email', {
				error: error instanceof Error ? error.message : String(error),
				recipientEmail: data.recipientEmail
			})
		}
	}
}