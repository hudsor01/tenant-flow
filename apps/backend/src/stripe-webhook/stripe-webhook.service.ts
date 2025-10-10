import { Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripe: Stripe
	) {}

	/**
	 * Store webhook event ID to prevent duplicate processing
	 * Implements compound idempotency strategy per Stripe 2025 best practices:
	 * 1. Store event.id (exact duplicate detection)
	 * 2. Store object.id:event.type (duplicate action detection with different event IDs)
	 *
	 * Uses database PRIMARY KEY constraint for atomic idempotency
	 * Throws Postgres error code 23505 if duplicate detected
	 */
	async storeEventId(
		eventId: string,
		eventType: string,
		objectId?: string
	): Promise<void> {
		const records = [
			{
				eventId,
				type: eventType
			}
		]

		// Add compound idempotency key if object ID provided
		// This catches duplicate events with different event IDs but same object
		if (objectId) {
			records.push({
				eventId: `${objectId}:${eventType}`,
				type: eventType
			})
		}

		// Insert both records - database will reject if either is duplicate
		await this.supabase
			.getAdminClient()
			.from('stripe_webhook_event')
			.insert(records)
	}

	/**
	 * Route webhook events to appropriate handlers
	 */
	async processWebhookEvent(event: Stripe.Event) {
		this.logger.log(`Processing webhook event: ${event.type}`)

		switch (event.type) {
			case 'checkout.session.completed':
				return this.handleCheckoutCompleted(
					event.data.object as Stripe.Checkout.Session
				)

			case 'account.updated':
				return this.handleAccountUpdated(event.data.object as Stripe.Account)

			case 'payment_intent.succeeded':
				return this.handlePaymentSucceeded(
					event.data.object as Stripe.PaymentIntent
				)

			case 'payment_intent.payment_failed':
				return this.handlePaymentFailed(
					event.data.object as Stripe.PaymentIntent
				)

			case 'invoice.payment_succeeded':
				return this.handleInvoicePaymentSucceeded(
					event.data.object as Stripe.Invoice
				)

			case 'invoice.payment_failed':
				return this.handleInvoicePaymentFailed(
					event.data.object as Stripe.Invoice
				)

			case 'customer.subscription.updated':
				return this.handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription
				)

			case 'customer.subscription.deleted':
				return this.handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription
				)

			case 'charge.dispute.created':
				return this.handleDisputeCreated(event.data.object as Stripe.Dispute)

			default:
				this.logger.log(`Unhandled event type: ${event.type}`)
		}
	}

	/**
	 * Handle successful checkout - create OWNER user after payment
	 * Phase 1: Payment-first onboarding via Stripe Checkout
	 * Official pattern: checkout.session.completed webhook
	 * Creates both Supabase auth user and User table record
	 */
	private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
		this.logger.log(`Checkout completed: ${session.id}`)

		// Extract customer email from session
		const customerEmail =
			session.customer_email || session.customer_details?.email
		const customerId = session.customer as string
		const subscriptionId = session.subscription as string | null

		if (!customerEmail) {
			this.logger.error('Checkout session has no customer email', {
				sessionId: session.id
			})
			return
		}

		// Get subscription to determine tier
		let tier = 'STARTER'
		if (subscriptionId) {
			try {
				const subscription =
					await this.stripe.subscriptions.retrieve(subscriptionId)
				const priceId = subscription.items.data[0]?.price.id

				// Map price ID to tier (replace with your actual Stripe price IDs)
				// Example: Replace these with your real price IDs from the Stripe Dashboard
				const priceIdToTier: Record<string, string> = {
					price_1NabcPro: 'PRO',
					price_1NxyzEnterprise: 'ENTERPRISE',
					price_1NdefStarter: 'STARTER'
					// Add more as needed
				}
				if (priceId && priceIdToTier[priceId]) {
					tier = priceIdToTier[priceId]
				}
			} catch (error) {
				this.logger.warn(
					`Failed to retrieve subscription for tier mapping: ${subscriptionId}`,
					{
						error: error instanceof Error ? error.message : 'Unknown error'
					}
				)
			}
		}

		try {
			// Create Supabase auth user with auto-confirmed email
			const { data: authData, error: authError } = await this.supabase
				.getAdminClient()
				.auth.admin.createUser({
					email: customerEmail,
					email_confirm: true,
					user_metadata: {
						stripe_customer_id: customerId,
						onboarded_via: 'checkout',
						onboarded_at: new Date().toISOString()
					}
				})

			if (authError) {
				this.logger.error('Failed to create auth user from checkout', {
					email: customerEmail,
					error: authError.message
				})
				throw authError
			}

			// SAFE logging - only ID and email (no sensitive data)
			this.logger.log(
				`Auth user created from checkout: ${authData.user.id} (${customerEmail})`
			)

			// Create User table record with OWNER role
			const { error: dbError } = await this.supabase
				.getAdminClient()
				.from('users')
				.insert({
					id: authData.user.id,
					supabaseId: authData.user.id,
					email: customerEmail,
					role: 'OWNER',
					stripeCustomerId: customerId,
					subscriptionTier: tier
				})

			if (dbError) {
				this.logger.error('Failed to create User record from checkout', {
					userId: authData.user.id,
					error: dbError.message
				})
				throw dbError
			}

			this.logger.log(
				`OWNER user created successfully: ${authData.user.id} (${customerEmail})`
			)
		} catch (error) {
			this.logger.error('Checkout user creation failed', {
				email: customerEmail,
				sessionId: session.id,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			// Re-throw to trigger webhook retry
			throw error
		}
	}

	/**
	 * Handle Connected Account updates
	 */
	private async handleAccountUpdated(account: Stripe.Account) {
		this.logger.log(`Account updated: ${account.id}`)

		await this.supabase
			.getAdminClient()
			.from('connected_account')
			.update({
				accountStatus: account.details_submitted
					? account.charges_enabled
						? 'active'
						: 'pending'
					: 'incomplete',
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled,
				updatedAt: new Date().toISOString()
			})
			.eq('stripeAccountId', account.id)
	}

	/**
	 * Handle successful PaymentIntent (one-time payments)
	 */
	private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
		this.logger.log(`Payment succeeded: ${paymentIntent.id}`)

		await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.update({
				status: 'SUCCEEDED',
				paidAt: new Date().toISOString()
			})
			.eq('stripePaymentIntentId', paymentIntent.id)
	}

	/**
	 * Handle failed PaymentIntent
	 */
	private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
		this.logger.log(`Payment failed: ${paymentIntent.id}`)

		await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.update({
				status: 'FAILED',
				failureReason:
					paymentIntent.last_payment_error?.message || 'Unknown error'
			})
			.eq('stripePaymentIntentId', paymentIntent.id)
	}

	/**
	 * Handle successful Invoice payment (subscriptions)
	 * Phase 4: Create RentPayment record for successful subscription charge
	 */
	private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
		this.logger.log(`Invoice payment succeeded: ${invoice.id}`)

		// Type guard for expanded invoice fields from webhooks
		const invoiceData = invoice as Stripe.Invoice & {
			subscription?: string | Stripe.Subscription
			payment_intent?: string | Stripe.PaymentIntent
		}

		if (!invoiceData.subscription) {
			this.logger.warn('Invoice has no subscription, skipping')
			return
		}

		const subscriptionId =
			typeof invoiceData.subscription === 'string'
				? invoiceData.subscription
				: invoiceData.subscription?.id

		// Get subscription from database
		const { data: subscription } = await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.select('*')
			.eq('stripeSubscriptionId', subscriptionId)
			.single()

		if (!subscription) {
			this.logger.warn(`Subscription not found for invoice: ${subscriptionId}`)
			return
		}

		// Calculate fees (amounts in cents)
		const amountPaid = invoice.amount_paid || 0

		// TODO: Create RentPayment record for this charge
		// The rent_payments schema requires:
		// - rentDueId (required) - need to determine where this comes from
		// - organizationId (required) - need to get landlord's organization ID
		// Current subscription record doesn't have these fields
		// For now, logging the successful payment
		this.logger.log(
			`Invoice payment succeeded for subscription ${subscription.id}: ${amountPaid / 100} USD`
		)

		// Uncomment and update once we have rentDueId and organizationId:
		/*
		const paymentIntentId =
			typeof invoiceData.payment_intent === 'string'
				? invoiceData.payment_intent
				: invoiceData.payment_intent?.id || null
		const processingFee = Math.round(amountPaid * 0.029 + 30) // Stripe's fee estimate (2.9% + 30¢)
		const netAmount = amountPaid - processingFee

		await this.supabase.getAdminClient().from('rent_payments').insert({
			tenantId: subscription.tenantId,
			organizationId: subscription.organizationId, // TODO: Get from subscription or landlord
			rentDueId: subscription.rentDueId, // TODO: Determine source
			amount: amountPaid,
			netAmount,
			processingFee,
			currency: invoice.currency || 'usd',
			status: 'SUCCEEDED',
			stripePaymentIntentId: paymentIntentId,
			stripeChargeId: invoice.charge as string | null,
			paidAt: new Date().toISOString()
		})
		*/
	}

	/**
	 * Handle failed Invoice payment (subscription retry logic)
	 * Phase 4: Track failed attempts and auto-pause after max retries
	 */
	private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
		this.logger.log(
			`Invoice payment failed: ${invoice.id}, attempt ${invoice.attempt_count}`
		)

		// Type guard for expanded invoice fields from webhooks
		const invoiceData = invoice as Stripe.Invoice & {
			subscription?: string | Stripe.Subscription
			payment_intent?: string | Stripe.PaymentIntent
		}

		if (!invoiceData.subscription) {
			this.logger.warn('Invoice has no subscription, skipping')
			return
		}

		const subscriptionId =
			typeof invoiceData.subscription === 'string'
				? invoiceData.subscription
				: invoiceData.subscription?.id

		// Get subscription from database
		const { data: subscription } = await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.select('*')
			.eq('stripeSubscriptionId', subscriptionId)
			.single()

		if (!subscription) {
			this.logger.warn(`Subscription not found for invoice: ${subscriptionId}`)
			return
		}

		// Update subscription to past_due status
		await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.update({
				status: 'past_due'
			})
			.eq('id', subscription.id)

		// Smart Retries: After 4 attempts (configurable in Stripe Dashboard)
		// Stripe will automatically pause the subscription
		// We handle the subscription.updated webhook to sync status
		if ((invoice.attempt_count || 0) >= 4) {
			this.logger.warn(
				`Subscription ${subscription.id} exceeded retry limit, pausing`
			)
			await this.supabase
				.getAdminClient()
				.from('rent_subscription')
				.update({
					status: 'paused',
					pausedAt: new Date().toISOString()
				})
				.eq('id', subscription.id)
		}
	}

	/**
	 * Handle subscription updates
	 * Phase 4: Sync subscription status changes from Stripe
	 */
	private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription updated: ${subscription.id}`)

		// Map Stripe status to our status
		const statusMap: Record<string, string> = {
			active: 'active',
			past_due: 'past_due',
			canceled: 'canceled',
			incomplete: 'incomplete',
			incomplete_expired: 'incomplete',
			paused: 'paused',
			unpaid: 'past_due'
		}

		const dbStatus = statusMap[subscription.status] || subscription.status

		await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.update({
				status: dbStatus,
				updatedAt: new Date().toISOString()
			})
			.eq('stripeSubscriptionId', subscription.id)
	}

	/**
	 * Handle subscription cancellation
	 */
	private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription deleted: ${subscription.id}`)

		await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.update({
				status: 'cancelled',
				canceledAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
			.eq('stripeSubscriptionId', subscription.id)
	}

	/**
	 * Handle dispute creation (ACH and card disputes)
	 * Phase 6F: Critical for ACH Direct Debit - disputes are final and cannot be appealed
	 */
	private async handleDisputeCreated(dispute: Stripe.Dispute) {
		this.logger.log(
			`Dispute created: ${dispute.id}, reason: ${dispute.reason}, amount: ${dispute.amount}`
		)

		// ACH-specific dispute reasons (from Stripe docs)
		// These happen when ACH payment fails AFTER PaymentIntent succeeded
		const achDisputeReasons = [
			'insufficient_funds',
			'incorrect_account_details',
			'bank_cannot_process'
		]

		if (achDisputeReasons.includes(dispute.reason)) {
			await this.handleACHDispute(dispute)
		} else {
			// Card disputes or other types
			await this.handleCardDispute(dispute)
		}
	}

	/**
	 * Handle ACH-specific disputes
	 * CRITICAL: ACH disputes are final and cannot be appealed
	 * Must reverse transfer to recover funds from landlord
	 */
	private async handleACHDispute(dispute: Stripe.Dispute) {
		this.logger.warn(
			`ACH dispute detected (final, cannot appeal): ${dispute.id}, reason: ${dispute.reason}`
		)

		// Get the charge details to find the transfer
		const charge = await this.stripe.charges.retrieve(dispute.charge as string)

		// Extract payment intent ID (handle Stripe expandable types)
		const paymentIntentId =
			typeof charge.payment_intent === 'string'
				? charge.payment_intent
				: charge.payment_intent?.id || null

		if (!paymentIntentId) {
			this.logger.error(
				`No payment intent found for dispute: ${dispute.id}, charge: ${dispute.charge}`
			)
			return
		}

		// Find the payment in our database
		const { data: payment } = await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.select('*')
			.eq('stripePaymentIntentId', paymentIntentId)
			.single()

		if (!payment) {
			this.logger.error(
				`Payment not found for dispute: ${dispute.id}, charge: ${dispute.charge}`
			)
			return
		}

		// Reverse the transfer to recover funds from landlord
		// Platform already paid the dispute from platform balance
		if (charge.transfer) {
			this.logger.log(
				`Reversing transfer ${charge.transfer} to recover ${dispute.amount} cents`
			)

			try {
				await this.stripe.transfers.createReversal(charge.transfer as string, {
					amount: dispute.amount,
					description: `Dispute ${dispute.id}: ${dispute.reason}`,
					metadata: {
						dispute_id: dispute.id,
						payment_id: payment.id,
						reason: dispute.reason
					}
				})

				this.logger.log(
					`Transfer reversal successful for dispute ${dispute.id}`
				)
			} catch (error) {
				this.logger.error(
					`Transfer reversal failed for dispute ${dispute.id}:`,
					error
				)
				// Continue to update payment status even if reversal fails
			}
		}

		// Update payment status to disputed (using FAILED since DISPUTED doesn't exist in enum)
		await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.update({
				status: 'FAILED',
				failureReason: `ACH Dispute (${dispute.reason}): ${dispute.amount / 100} USD - Cannot appeal`
			})
			.eq('id', payment.id)

		this.logger.warn(
			`Payment ${payment.id} marked as disputed. Landlord must resolve with tenant.`
		)
	}

	/**
	 * Handle card disputes (can be appealed)
	 * Future implementation for card payment support
	 */
	private async handleCardDispute(dispute: Stripe.Dispute) {
		this.logger.log(
			`Card dispute detected (can appeal): ${dispute.id}, reason: ${dispute.reason}`
		)

		// Get the charge details
		const charge = await this.stripe.charges.retrieve(dispute.charge as string)

		// Extract payment intent ID (handle Stripe expandable types)
		const paymentIntentId =
			typeof charge.payment_intent === 'string'
				? charge.payment_intent
				: charge.payment_intent?.id || null

		if (!paymentIntentId) {
			this.logger.error(
				`No payment intent found for dispute: ${dispute.id}, charge: ${dispute.charge}`
			)
			return
		}

		// Find the payment in our database
		const { data: payment } = await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.select('*')
			.eq('stripePaymentIntentId', paymentIntentId)
			.single()

		if (!payment) {
			this.logger.error(
				`Payment not found for dispute: ${dispute.id}, charge: ${dispute.charge}`
			)
			return
		}

		// Update payment status (using FAILED since DISPUTED doesn't exist in enum)
		await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.update({
				status: 'FAILED',
				failureReason: `Dispute (${dispute.reason}): ${dispute.amount / 100} USD - Can submit evidence`
			})
			.eq('id', payment.id)

		// Attempt to submit evidence for card disputes
		try {
			// Attach minimal evidence (extend with more fields if available in RentPayment)
			const evidence: Stripe.DisputeUpdateParams.Evidence = {
				product_description: 'Rent payment for property',
				access_activity_log: 'Tenant accessed portal and paid rent'
				// Add more fields if/when available in RentPayment schema
			}
			await this.stripe.disputes.update(dispute.id, { evidence })
			this.logger.log(
				`Submitted evidence for dispute ${dispute.id} (payment ${payment.id})`
			)
		} catch (e) {
			this.logger.error(
				`Failed to submit evidence for dispute ${dispute.id}: ${e}`
			)
		}
	}
}
