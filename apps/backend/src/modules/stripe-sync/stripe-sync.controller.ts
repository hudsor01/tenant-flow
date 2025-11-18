/**
 * Stripe Sync Engine Webhook Controller
 *
 * Processes Stripe webhooks using @supabase/stripe-sync-engine npm library
 * Direct integration per official documentation - no custom abstractions
 *
 * See: https://github.com/supabase/stripe-sync-engine
 */

import {
	BadRequestException,
	Controller,
	Header,
	Inject,
	Logger,
	Post,
	Req,
	SetMetadata
} from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import type { Request } from 'express'
import { Throttle } from '@nestjs/throttler'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { StripeAccessControlService } from '../billing/stripe-access-control.service'
import { StripeSyncService } from '../billing/stripe-sync.service'
import { AppConfigService } from '../../config/app-config.service'

// Public decorator for webhook endpoints (bypasses JWT auth)
const Public = () => SetMetadata('isPublic', true)

@Controller('webhooks')
export class StripeSyncController {
	private readonly logger = new Logger(StripeSyncController.name)

	constructor(
		@Inject(StripeSyncService)
		private readonly stripeSyncService: StripeSyncService,
		private readonly stripeClientService: StripeClientService,
		private readonly supabaseService: SupabaseService,
		private readonly accessControlService: StripeAccessControlService,
		private readonly appConfigService: AppConfigService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache
	) {
		// Ensure TypeScript recognizes usage of appConfigService
		if (!appConfigService) {
			throw new Error('AppConfigService is required')
		}
	}

	/**
	 * Check if webhook event already processed (idempotency per Stripe best practices 2025)
	 * Prevents duplicate processing if Stripe sends same event multiple times
	 */
	private async isEventProcessed(eventId: string): Promise<boolean> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('stripe_processed_events')
			.select('event_id')
			.eq('event_id', eventId)
			.maybeSingle()

		if (error && error.code !== 'PGRST116') {
			// PGRST116 = not found, which is expected for new events
			this.logger.error('Error checking event idempotency', {
				error: error.message,
				eventId
			})
		}

		return !!data
	}

	/**
	 * Mark webhook event as processed (idempotency tracking)
	 */
	private async markEventProcessed(eventId: string): Promise<void> {
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('stripe_processed_events')
			.insert({
				stripe_event_id: eventId,
				processed_at: new Date().toISOString()
			})

		if (error && error.code !== '23505') {
			// 23505 = unique constraint violation (event already exists, safe to ignore)
			this.logger.warn('Failed to mark event as processed', {
				error: error.message,
				eventId
			})
		}
	}

	/**
	 * Link Stripe customer to Supabase user + Handle business logic
	 * Called after Sync Engine processes webhook to maintain user_id mapping
	 */
	private async processWebhookBusinessLogic(
		rawBody: Buffer,
		signature: string
	) {
		try {
			// We need to parse the event again to get the event type
			// This is safe because Sync Engine already validated the signature
			const event: Stripe.Event =
				this.stripeClientService.constructWebhookEvent(
					rawBody,
					signature,
					this.appConfigService.getStripeWebhookSecret()
				)

			this.logger.log('Processing webhook business logic', {
				eventId: event.id
			})

			// IDEMPOTENCY CHECK: Prevent duplicate processing
			if (await this.isEventProcessed(event.id)) {
				this.logger.log('Event already processed, skipping', {
					eventId: event.id,
					eventType: event.type
				})
				return
			}

			// Handle customer linking
			if (
				event.type === 'customer.created' ||
				event.type === 'customer.updated'
			) {
				await this.linkCustomerToUser(event)
			}

			// Handle checkout.session.completed (CRITICAL: was missing!)
			if (event.type === 'checkout.session.completed') {
				await this.handleCheckoutCompleted(event)
			}

			// Handle payment_intent.succeeded (CRITICAL: was missing!)
			if (event.type === 'payment_intent.succeeded') {
				await this.handlePaymentSucceeded(event)
			}

			// Handle pricing cache invalidation when products/prices change
			if (
				event.type === 'product.created' ||
				event.type === 'product.updated' ||
				event.type === 'product.deleted' ||
				event.type === 'price.created' ||
				event.type === 'price.updated' ||
				event.type === 'price.deleted'
			) {
				await this.invalidatePricingCache(event.type)
			}

			// Handle subscription access control
			switch (event.type) {
				case 'customer.subscription.created':
				case 'customer.subscription.updated': {
					const subscription = event.data.object as Stripe.Subscription
					// Grant access if subscription is active or trialing
					if (
						subscription.status === 'active' ||
						subscription.status === 'trialing'
					) {
						await this.accessControlService.grantSubscriptionAccess(
							subscription
						)
					}
					// Revoke access if subscription is canceled
					else if (
						subscription.status === 'canceled' ||
						subscription.status === 'past_due' ||
						subscription.status === 'unpaid'
					) {
						await this.accessControlService.revokeSubscriptionAccess(
							subscription
						)
					}
					break
				}
				case 'customer.subscription.deleted': {
					const subscription = event.data.object as Stripe.Subscription
					await this.accessControlService.revokeSubscriptionAccess(subscription)
					break
				}
			}

			// Mark event as processed AFTER successful handling
			await this.markEventProcessed(event.id)
		} catch (error) {
			this.logger.error('Error processing webhook business logic', {
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			// Don't throw - business logic errors shouldn't fail the webhook
		}
	}

	/**
	 * Invalidate pricing cache when products/prices change in Stripe
	 * Called automatically by webhook handler on product/price events
	 */
	private async invalidatePricingCache(eventType: string) {
		this.logger.log('Invalidating pricing cache due to webhook', {
			eventType
		})

		try {
			await Promise.all([
				this.cacheManager.del('stripe:products'),
				this.cacheManager.del('stripe:prices'),
				this.cacheManager.del('stripe:pricing-config')
			])

			this.logger.log('Pricing cache invalidated successfully', {
				eventType
			})
		} catch (error) {
			this.logger.error('Failed to invalidate pricing cache', {
				error: error instanceof Error ? error.message : 'Unknown error',
				eventType
			})
			// Don't throw - cache invalidation errors shouldn't fail the webhook
		}
	}

	/**
	 * CRITICAL FIX: Handle checkout.session.completed webhook
	 * Records one-time payments in rent_payments table
	 *
	 * Without this handler, payments succeed but are NEVER recorded in DB!
	 */
	private async handleCheckoutCompleted(event: Stripe.Event) {
		const session = event.data.object as Stripe.Checkout.Session

		this.logger.log('Processing checkout.session.completed', {
			sessionId: session.id,
			customerId: session.customer,
			amountTotal: session.amount_total,
			currency: session.currency,
			paymentStatus: session.payment_status
		})

		// Only process successful payments
		if (session.payment_status !== 'paid') {
			this.logger.warn('Checkout session not paid, skipping', {
				sessionId: session.id,
				paymentStatus: session.payment_status
			})
			return
		}

		// Extract metadata (should contain lease_id, tenant_id from frontend)
		const lease_id = session.metadata?.lease_id
		const tenant_id = session.metadata?.tenant_id
		const paymentType = session.metadata?.paymentType || 'rent'

		if (!lease_id || !tenant_id) {
			this.logger.error('Missing required metadata in checkout session', {
				sessionId: session.id,
				metadata: session.metadata
			})
			return
		}

		// Type assertion to ensure TypeScript knows these are defined after the guard
		const safelease_id = lease_id!
		const safetenant_id = tenant_id!

		// Get lease with property to retrieve owner_id
		const { data: lease, error: leaseError } = await this.supabaseService
			.getAdminClient()
			.from('leases')
			.select('*, property_id!inner(owner_id)')
			.eq('id', safelease_id)
			.single()

		if (leaseError || !lease) {
			this.logger.error('Failed to fetch lease/property for checkout payment', {
				error: leaseError?.message,
				lease_id: safelease_id,
				sessionId: session.id
			})
			return
		}

		// Calculate amount (no platform fees - owner receives full amount minus Stripe fees)
		const amountInCents = session.amount_total || 0
		const amountInDollars = amountInCents / 100

		if (session.payment_intent) {
			try {
			// Receipt URL can be fetched for logging but not currently stored
			const stripe = this.stripeClientService.getClient()
			const paymentIntent = await stripe.paymentIntents.retrieve(
				session.payment_intent as string,
				{ expand: ['latest_charge'] }
			)

			if (
				paymentIntent.latest_charge &&
				typeof paymentIntent.latest_charge === 'object'
			) {
				// Receipt URL available at (paymentIntent.latest_charge as Stripe.Charge).receipt_url
			}
		} catch (error) {
				this.logger.warn('Failed to fetch receipt URL for checkout payment', {
					sessionId: session.id,
					paymentIntentId: session.payment_intent,
					error: error instanceof Error ? error.message : 'Unknown Stripe error'
				})
			}
		}

		// Record payment in database
		// NOTE: We rely on unique constraint on stripePaymentIntentId to prevent duplicates
		// If duplicate, we handle the error gracefully below
		const now = new Date()
		const today = now.toISOString().split('T')[0]

		const paymentRecord = {
				lease_id: safelease_id,
				tenant_id: safetenant_id,
				amount: Math.round(amountInDollars * 100), // Convert to cents
				currency: 'usd',
				status: 'succeeded' as const,
				due_date: today,
				paid_date: now.toISOString(),
				period_start: today,
				period_end: today,
				payment_method_type: paymentType,
			stripe_payment_intent_id: session.payment_intent as string,
			application_fee_amount: 0
		}

		const { error } = await this.supabaseService
			.getAdminClient()
			.from('rent_payments')
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.insert(paymentRecord as any)

		if (error) {
			// Check if it's a conflict (duplicate) or actual error
			if (
				error.code === '23505' ||
				error.message.includes('duplicate key value')
			) {
				this.logger.log(
					'Checkout payment already exists (webhook retry), skipping duplicate',
					{
						sessionId: session.id,
						lease_id,
						tenant_id,
						stripePaymentIntentId: session.payment_intent,
						amount: amountInDollars
					}
				)
			} else {
				this.logger.error('Failed to record checkout payment', {
					error: error.message,
					sessionId: session.id,
					lease_id,
					tenant_id,
					stripePaymentIntentId: session.payment_intent
				})
			}
		} else {
			this.logger.log('Checkout payment recorded successfully', {
				sessionId: session.id,
				lease_id,
				tenant_id,
				amount: amountInDollars,
				stripePaymentIntentId: session.payment_intent
			})
		}
	}

	/**
	 * Handle payment_intent.succeeded webhook
	 * Tracks successful payments for subscriptions and one-time charges
	 */
	private async handlePaymentSucceeded(event: Stripe.Event) {
		const paymentIntent = event.data.object as Stripe.PaymentIntent

		this.logger.log('Processing payment_intent.succeeded', {
			paymentIntentId: paymentIntent.id,
			customerId: paymentIntent.customer,
			amount: paymentIntent.amount,
			currency: paymentIntent.currency,
			status: paymentIntent.status
		})

		// If payment is for a subscription, it's already handled by subscription webhooks
		// This handler is for additional payment tracking/logging
		// Can be extended for: fraud detection, analytics, email receipts, etc.
	}

	/**
	 * Link Stripe customer to Supabase user by email
	 * Uses the link_stripe_customer_to_user database function
	 */
	private async linkCustomerToUser(event: Stripe.Event) {
		const customer = event.data.object as Stripe.Customer

		if (!customer.email) {
			this.logger.warn('Customer has no email, skipping user linking', {
				customerId: customer.id
			})
			return
		}

		// Call the database function to link customer to user
		const { data, error } = await this.supabaseService.rpcWithRetries(
			'link_stripe_customer_to_user',
			{
				p_stripe_customer_id: customer.id,
				p_email: customer.email
			}
		)

		if (error) {
			this.logger.warn('Failed to link Stripe customer to user', {
				error: error.message || String(error),
				customerId: customer.id,
				email: customer.email
			})
		} else if (data) {
			this.logger.log('Linked Stripe customer to user', {
				customerId: customer.id,
				user_id: data
			})
		}
	}

	/**
	 * Stripe Sync Engine webhook endpoint
	 * Automatically syncs all Stripe data to stripe.* tables
	 *
	 * Endpoint: POST /webhooks/stripe-sync
	 * Security: Validates Stripe signature
	 */
	@Public() // Stripe webhooks don't use JWT auth
	@Throttle({ default: { ttl: 60000, limit: 30 } })
	@Post('stripe-sync')
	@Header('content-type', 'application/json')
	async handleStripeSyncWebhook(@Req() req: Request) {
		const signature = req.headers['stripe-signature']

		if (!signature || typeof signature !== 'string') {
			throw new BadRequestException('Missing Stripe signature')
		}

		// Express raw() middleware stores buffer in req.body
		const rawBody = req.body as Buffer

		if (!rawBody || !Buffer.isBuffer(rawBody)) {
			throw new BadRequestException(
				'Missing raw body for signature verification'
			)
		}

		try {
			this.logger.log('Processing Stripe webhook via Sync Engine')

			// Stripe Sync Engine handles:
			// - Signature verification
			// - Event processing
			// - Database synchronization to stripe.* schema
			// - Idempotency
			await this.stripeSyncService.processWebhook(rawBody, signature)

			// Process business logic AFTER sync to ensure stripe.* data exists
			// This includes:
			// - Linking customers to users
			// - Granting/revoking subscription access
			// - Sending email notifications
			await this.processWebhookBusinessLogic(rawBody, signature)

			this.logger.log('Stripe webhook processed successfully')

			return { received: true }
		} catch (error) {
			this.logger.error('Failed to process Stripe webhook', {
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			})
			throw new BadRequestException('Webhook processing failed')
		}
	}
}
