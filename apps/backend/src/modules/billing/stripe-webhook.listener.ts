/**
 * Stripe Webhook Event Listeners
 *
 * Handles Stripe events using NestJS EventEmitter2
 * Replaces manual Saga compensation with event-driven cleanup
 */

import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { OnEvent } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import type { Database } from '@repo/shared/types/supabase-generated'

@Injectable()
export class StripeWebhookListener {
	private readonly logger = new Logger(StripeWebhookListener.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Handle payment method attached to subscription
	 * Update tenant invitation status to ACCEPTED
	 */
	@OnEvent('stripe.payment_method.attached')
	async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
		this.logger.log('Payment method attached', {
			customerId: paymentMethod.customer
		})

		const client = this.supabase.getAdminClient()

		// Get customer ID from payment method
		const customerId =
			typeof paymentMethod.customer === 'string'
				? paymentMethod.customer
				: paymentMethod.customer?.id

		if (!customerId) {
			this.logger.warn('No customer ID on payment method')
			return
		}

		// Find tenant by Stripe Customer ID
		const { data: tenant } = await client
			.from('tenant')
			.select('id')
			.eq('stripeCustomerId', customerId)
			.single()

		if (!tenant) {
			this.logger.warn('Tenant not found for payment method', {
				customerId: paymentMethod.customer
			})
			return
		}

		// Update invitation status
		await client
			.from('tenant')
			.update({
				invitation_status:
					'ACCEPTED' as Database['public']['Enums']['invitation_status'],
				updated_at: new Date().toISOString()
			})
			.eq('id', tenant.id)

		this.logger.log('Tenant invitation accepted', {
			tenantId: tenant.id
		})
	}

	/**
	 * Handle subscription activated
	 * Update lease status to ACTIVE
	 */
	@OnEvent('stripe.customer.subscription.updated')
	async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
		this.logger.log('Subscription updated', {
			subscriptionId: subscription.id,
			status: subscription.status
		})

		const client = this.supabase.getAdminClient()

		// Find lease by Stripe Subscription ID
		const { data: lease } = await client
			.from('lease')
			.select('id')
			.eq('stripeSubscriptionId', subscription.id)
			.single()

		if (!lease) {
			this.logger.warn('Lease not found for subscription', {
				subscriptionId: subscription.id
			})
			return
		}

		// Map Stripe subscription status to lease status
		let leaseStatus: Database['public']['Enums']['LeaseStatus'] = 'DRAFT' // FIX: PENDING doesn't exist in LeaseStatus

		if (subscription.status === 'active') {
			leaseStatus = 'ACTIVE'
		} else if (subscription.status === 'canceled') {
			leaseStatus = 'TERMINATED'
		}

		await client
			.from('lease')
			.update({
				status: leaseStatus,
				updated_at: new Date().toISOString()
			})
			.eq('id', lease.id)

		this.logger.log('Lease status updated', {
			leaseId: lease.id,
			status: leaseStatus
		})
	}

	/**
	 * Handle payment failure
	 * Log for owner notification
	 */
	@OnEvent('stripe.invoice.payment_failed')
	async handlePaymentFailed(invoice: Stripe.Invoice) {
		this.logger.error('Payment failed', {
			invoiceId: invoice.id,
			customerId: invoice.customer,
			amount: invoice.amount_due
		})

		// TODO: Send notification to property owner
		// TODO: Send notification to tenant
	}

	/**
	 * Handle tenant invitation failure
	 * Event-driven cleanup (replaces Saga compensation)
	 */
	@OnEvent('tenant.invitation.failed')
	async handleInvitationFailed(event: {
		ownerId: string
		error: Error | unknown
	}) {
		this.logger.error('Tenant invitation failed - cleanup initiated', {
			ownerId: event.ownerId,
			error: event.error instanceof Error ? event.error.message : String(event.error)
		})

		// Cleanup logic here (if needed)
		// Database transaction already rolled back automatically
		// Stripe resources might need cleanup
	}
}
