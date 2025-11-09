/**
 * Stripe Webhook Event Listeners
 *
 * Handles Stripe events using NestJS EventEmitter2
 * Replaces manual Saga compensation with event-driven cleanup
 */

import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { PrometheusService } from '../observability/prometheus.service'
import type { Database } from '@repo/shared/types/supabase-generated'
import { PaymentFailedEvent } from '../notifications/events/notification.events'

@Injectable()
export class StripeWebhookListener {
	private readonly logger = new Logger(StripeWebhookListener.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly prometheus: PrometheusService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Handle payment method attached to subscription
	 * Update tenant invitation status to ACCEPTED
	 */
	@OnEvent('stripe.payment_method.attached')
	async handlePaymentMethodAttached(event: {
		paymentMethod?: Stripe.PaymentMethod
		eventId?: string
		eventType?: string
		[key: string]: unknown
	}) {
		// Type guard: Check if this is a PaymentMethod event
		const paymentMethod = event as unknown as Stripe.PaymentMethod

		try {
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
		} catch (error) {
			// Record failure details
			this.prometheus.recordWebhookFailure(
				event.eventType || 'payment_method.attached',
				error instanceof Error ? error.constructor.name : 'UnknownError'
			)

			this.logger.error('Failed to handle payment method attached', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			})

			// Re-throw to propagate error to controller
			throw error
		}
	}

	/**
	 * Handle subscription activated
	 * Update lease status to ACTIVE
	 */
	@OnEvent('stripe.customer.subscription.updated')
	async handleSubscriptionUpdated(event: {
		subscription?: Stripe.Subscription
		eventId?: string
		eventType?: string
		[key: string]: unknown
	}) {
		// Type guard: Check if this is a Subscription event
		const subscription = event as unknown as Stripe.Subscription

		try {
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
		} catch (error) {
			// Record failure details
			this.prometheus.recordWebhookFailure(
				event.eventType || 'customer.subscription.updated',
				error instanceof Error ? error.constructor.name : 'UnknownError'
			)

			this.logger.error('Failed to handle subscription updated', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			})

			// Re-throw to propagate error to controller
			throw error
		}
	}

	/**
	 * Handle payment failure
	 * Log for owner notification
	 */
	@OnEvent('stripe.invoice.payment_failed')
	async handlePaymentFailed(event: {
		invoice?: Stripe.Invoice
		eventId?: string
		eventType?: string
		[key: string]: unknown
	}) {
		// Type guard: Check if this is an Invoice event
		const invoice = event as unknown as Stripe.Invoice

		try {
			this.logger.error('Payment failed', {
				invoiceId: invoice.id,
				customerId: invoice.customer,
				amount: invoice.amount_due
			})

			const subscriptionId = this.getInvoiceSubscriptionId(invoice)

			if (!subscriptionId) {
				this.logger.warn('Failed payment has no subscription reference', {
					invoiceId: invoice.id
				})
				return
			}

			type LeaseWithRelations =
				Database['public']['Tables']['lease']['Row'] & {
					property: { ownerId: string | null; name: string | null } | null
					unit: { unitNumber: string | null } | null
					tenant: { id: string; userId: string | null; name: string | null } | null
				}

			const { data: lease, error: leaseError } = await this.supabase
				.getAdminClient()
				.from('lease')
				.select(
					`
					id,
					tenantId,
					property:propertyId(ownerId, name),
					unit:unitId(unitNumber),
					tenant:tenantId(id, userId, name)
				`
				)
				.eq('stripeSubscriptionId', subscriptionId)
				.single<LeaseWithRelations>()

			if (leaseError || !lease) {
				this.logger.warn('No lease found for failed payment', {
					subscriptionId,
					error: leaseError?.message
				})
				return
			}

			const propertyName = lease.property?.name || 'Subscription'
			const propertyLabel = lease.unit?.unitNumber
				? `${propertyName} - Unit ${lease.unit.unitNumber}`
				: propertyName
			const errorMessage =
				this.getInvoicePaymentError(invoice) || invoice.description || null
			const ownerFailureReason =
				errorMessage ||
				`Payment for ${propertyLabel} failed. Please review the tenant payment method.`
			const tenantFailureReason =
				errorMessage ||
				`Your rent payment for ${propertyLabel} failed. Please update your payment method to avoid late fees.`

			const ownerId = lease.property?.ownerId

			if (!ownerId) {
				this.logger.warn('Lease missing owner for failed payment notification', {
					leaseId: lease.id,
					subscriptionId
				})
			} else {
				await this.eventEmitter.emitAsync(
					'payment.failed',
					new PaymentFailedEvent(
						ownerId,
						subscriptionId,
						invoice.amount_due,
						invoice.currency || 'usd',
						invoice.hosted_invoice_url || '',
						ownerFailureReason
					)
				)

				this.logger.log('Queued payment failed notification for owner', {
					ownerId,
					subscriptionId
				})
			}

			const tenantUserId = lease.tenant?.userId

			if (!tenantUserId) {
				this.logger.warn(
					'Tenant missing user account for failed payment notification',
					{
						leaseId: lease.id,
						tenantId: lease.tenantId,
						subscriptionId
					}
				)
			} else {
				await this.eventEmitter.emitAsync(
					'payment.failed',
					new PaymentFailedEvent(
						tenantUserId,
						subscriptionId,
						invoice.amount_due,
						invoice.currency || 'usd',
						invoice.hosted_invoice_url || '',
						tenantFailureReason
					)
				)

				this.logger.log('Queued payment failed notification for tenant', {
					tenantUserId,
					tenantId: lease.tenant?.id,
					subscriptionId
				})
			}
		} catch (error) {
			// Record failure details
			this.prometheus.recordWebhookFailure(
				event.eventType || 'invoice.payment_failed',
				error instanceof Error ? error.constructor.name : 'UnknownError'
			)

			this.logger.error('Failed to handle payment failed event', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			})

			// Re-throw to propagate error to controller
			throw error
}

	/**
	 * Safely extract the subscription id from a Stripe invoice
	 */
	private getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
		const raw = (
			invoice as Stripe.Invoice & {
				subscription?: string | Stripe.Subscription | null
			}
		).subscription

		if (!raw) {
			return null
		}

		if (typeof raw === 'string') {
			return raw
		}

		if (typeof raw === 'object' && typeof raw.id === 'string') {
			return raw.id
		}

		return null
	}

	/**
	 * Safely read the payment failure reason from the invoice
	 */
	private getInvoicePaymentError(invoice: Stripe.Invoice): string | null {
		const error = (
			invoice as Stripe.Invoice & {
				last_payment_error?: { message?: string | null } | null
			}
		).last_payment_error

		return typeof error?.message === 'string' ? error.message : null
	}

	/**
	 * Handle tenant invitation failure
	 * Event-driven cleanup (replaces Saga compensation)
	 */
	@OnEvent('tenant.invitation.failed')
	async handleInvitationFailed(event: {
		ownerId: string
		error: Error | unknown
		eventType?: string
	}) {
		try {
			this.logger.error('Tenant invitation failed - cleanup initiated', {
				ownerId: event.ownerId,
				error:
					event.error instanceof Error
						? event.error.message
						: String(event.error)
			})

			// Cleanup logic here (if needed)
			// Database transaction already rolled back automatically
			// Stripe resources might need cleanup
		} catch (error) {
			// Record failure details
			this.prometheus.recordWebhookFailure(
				event.eventType || 'tenant.invitation.failed',
				error instanceof Error ? error.constructor.name : 'UnknownError'
			)

			this.logger.error('Failed to handle invitation failed event', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			})

			// Re-throw to propagate error to controller
			throw error
		}
	}
}
