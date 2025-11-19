import type { LeaseStatus } from '@repo/shared/constants/status-types'
/**
 * Stripe Webhook Event Listeners
 *
 * Handles Stripe events using NestJS EventEmitter2
 * Replaces manual Saga compensation with event-driven cleanup
 */

import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common'
import type Stripe from 'stripe'
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { PrometheusService } from '../observability/prometheus.service'
import type { Database } from '@repo/shared/types/supabase'
import { PaymentFailedEvent } from '../notifications/events/notification.events'
import { StripeIdentityService } from './stripe-identity.service'

@Injectable()
export class StripeWebhookListener implements OnModuleDestroy {
	private readonly logger = new Logger(StripeWebhookListener.name)

	constructor(
		private readonly supabase: SupabaseService,
		@Optional() private readonly prometheus: PrometheusService | null,
		private readonly eventEmitter: EventEmitter2,
		private readonly identityService: StripeIdentityService
	) {}

	/**
	 * Cleanup on module destroy
	 * Note: EventEmitter2 doesn't provide a built-in way to unsubscribe all listeners
	 * This is a limitation of the library. Event listeners are cleared when the service instance is garbage collected.
	 */
	onModuleDestroy(): void {
		this.logger.debug('StripeWebhookListener shutting down')
		// EventEmitter2 listeners will be cleared when service instance is destroyed
	}

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
				.from('tenants')
				.select('id')
				.eq('stripe_customer_id', customerId)
				.single()

			if (!tenant) {
				this.logger.warn('Tenant not found for payment method', {
					customerId: paymentMethod.customer
				})
				return
			}

			// Update invitation status in tenant_invitations table
			const { data: tenantWithUser } = await client
				.from('tenants')
				.select('id, user_id, users!inner(email)')
				.eq('id', tenant.id)
				.single()

			if (tenantWithUser) {
				await client
					.from('tenant_invitations')
					.update({
						status: 'accepted',
						accepted_by_user_id: tenantWithUser.user_id,
						accepted_at: new Date().toISOString()
					})
					.eq('email', (tenantWithUser as { users: { email: string } }).users.email)
					.eq('status', 'pending')
			}

			this.logger.log('Tenant invitation accepted', {
				tenant_id: tenant.id
			})
		} catch (error) {
			// Record failure details
			this.prometheus?.recordWebhookFailure(
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
				.from('leases')
				.select('id')
				.eq('stripe_subscription_id', subscription.id)
				.single()

			if (!lease) {
				this.logger.warn('Lease not found for subscription', {
					subscriptionId: subscription.id
				})
				return
			}

			// Map Stripe subscription status to lease status
			let lease_status: LeaseStatus = 'DRAFT' // FIX: PENDING doesn't exist in LeaseStatus

			if (subscription.status === 'active') {
				lease_status = 'ACTIVE'
			} else if (subscription.status === 'canceled') {
				lease_status = 'TERMINATED'
			}

			await client
				.from('leases')
				.update({
					lease_status: lease_status,
					updated_at: new Date().toISOString()
				})
				.eq('id', lease.id)

			this.logger.log('Lease status updated', {
				lease_id: lease.id,
				status: lease_status
			})
		} catch (error) {
			// Record failure details
			this.prometheus?.recordWebhookFailure(
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
				Database['public']['Tables']['leases']['Row'] & {
					property: { owner_id: string | null; name: string | null } | null
					unit: { unit_number: string | null; property_id: string | null } | null
					tenant: { id: string; user_id: string | null; name: string | null } | null
				}

			const { data: lease, error: leaseError } = await this.supabase
				.getAdminClient()
				.from('leases')
				.select(
					`
					id,
					primary_tenant_id,
					property:properties!unit_id(owner_id, name),
					unit:units!inner(unit_number, property_id),
					tenant:tenants!primary_tenant_id(id, user_id, name)
				`
				)
				.eq('stripe_subscription_id', subscriptionId)
				.single<LeaseWithRelations>()

			if (leaseError || !lease) {
				this.logger.warn('No lease found for failed payment', {
					subscriptionId,
					error: leaseError?.message
				})
				return
			}

			const propertyName = lease.property?.name || 'Subscription'
			const propertyLabel = lease.unit?.unit_number
				? `${propertyName} - Unit ${lease.unit.unit_number}`
				: propertyName
			const errorMessage =
				this.getInvoicePaymentError(invoice) || invoice.description || null
			const ownerFailureReason =
				errorMessage ||
				`Payment for ${propertyLabel} failed. Please review the tenant payment method.`
			const tenantFailureReason =
				errorMessage ||
				`Your rent payment for ${propertyLabel} failed. Please update your payment method to avoid late fees.`

			const owner_id = lease.property?.owner_id

			if (!owner_id) {
				this.logger.warn('Lease missing owner for failed payment notification', {
					lease_id: lease.id,
					subscriptionId
				})
			} else {
				await this.eventEmitter.emitAsync(
					'payment.failed',
					new PaymentFailedEvent(
						owner_id,
						subscriptionId,
						invoice.amount_due,
						invoice.currency || 'usd',
						invoice.hosted_invoice_url || '',
						ownerFailureReason
					)
				)

				this.logger.log('Queued payment failed notification for owner', {
					owner_id,
					subscriptionId
				})
			}

			const tenantUserId = lease.tenant?.user_id

			if (!tenantUserId) {
				this.logger.warn(
					'Tenant missing user account for failed payment notification',
					{
						lease_id: lease.id,
						tenant_id: lease.primary_tenant_id,
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
				tenant_user_id: tenantUserId,
				tenant_id: lease.tenant?.id,
				subscription_id: subscriptionId
			})
			}
		} catch (error) {
			// Record failure details
			this.prometheus?.recordWebhookFailure(
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
		owner_id: string
		error: Error | unknown
		eventType?: string
	}) {
		try {
			this.logger.error('Tenant invitation failed - cleanup initiated', {
				owner_id: event.owner_id,
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
			this.prometheus?.recordWebhookFailure(
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

	@OnEvent('stripe.identity.verification_session.verified')
	async handleIdentityVerified(event: Stripe.Identity.VerificationSession & { eventType?: string }) {
		await this.identityService.handleVerificationSessionEvent(
			event as Stripe.Identity.VerificationSession
		)

		this.logger.log('Updated user identity verification status to verified', {
			sessionId: event.id
		})
	}

	@OnEvent('stripe.identity.verification_session.requires_input')
	async handleIdentityRequiresInput(event: Stripe.Identity.VerificationSession & { eventType?: string }) {
		await this.identityService.handleVerificationSessionEvent(
			event as Stripe.Identity.VerificationSession
		)

		this.logger.log('Identity verification requires input', {
			sessionId: event.id
		})
	}

	@OnEvent('stripe.identity.verification_session.canceled')
	async handleIdentityCanceled(event: Stripe.Identity.VerificationSession & { eventType?: string }) {
		await this.identityService.handleVerificationSessionEvent(
			event as Stripe.Identity.VerificationSession
		)

		this.logger.log('Identity verification session canceled', {
			sessionId: event.id
		})
	}
}
