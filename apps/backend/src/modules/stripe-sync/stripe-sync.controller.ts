/**
 * ULTRA-NATIVE CONTROLLER - Stripe Sync Engine Integration
 *
 * This controller handles Stripe webhooks using the official Stripe Sync Engine.
 * The sync engine automatically synchronizes Stripe data to the `stripe` schema.
 *
 * FORBIDDEN: Custom sync logic, manual database updates
 * ALLOWED: Official @supabase/stripe-sync-engine, built-in NestJS decorators
 *
 * See: https://github.com/supabase/stripe-sync-engine
 */

import {
	BadRequestException,
	Controller,
	Header,
	Logger,
	Optional,
	Post,
	Req,
	SetMetadata
} from '@nestjs/common'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import type { RawBodyRequest } from '../../shared/types/express-request.types'
import { StripeAccessControlService } from '../billing/stripe-access-control.service'

// Public decorator for webhook endpoints (bypasses JWT auth)
const Public = () => SetMetadata('isPublic', true)

// Import Stripe Sync types
import type { StripeSync } from '@supabase/stripe-sync-engine'

@Controller('webhooks')
export class StripeSyncController {
	private readonly logger = new Logger(StripeSyncController.name)
	private syncEngine: StripeSync | null = null

	constructor(
		@Optional() private readonly supabaseService?: SupabaseService,
		@Optional()
		private readonly accessControlService?: StripeAccessControlService
	) {
		// Initialize Stripe Sync Engine
		if (this.supabaseService) {
			try {
				// Dynamic import to handle package installation
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const { StripeSync } = require('@supabase/stripe-sync-engine')

				this.syncEngine = new StripeSync({
					stripe: {
						apiKey: process.env.STRIPE_SECRET_KEY!,
						apiVersion: '2024-12-18.acacia'
					},
					db: {
						connectionString: process.env.DATABASE_URL!
					}
				})

				this.logger.log('Stripe Sync Engine initialized successfully')
			} catch (error) {
				this.logger.error('Failed to initialize Stripe Sync Engine', {
					error: error instanceof Error ? error.message : 'Unknown error'
				})
			}
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
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const Stripe = require('stripe')
			const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

			const event: Stripe.Event = stripe.webhooks.constructEvent(
				rawBody,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET
			)

			this.logger.log('Processing webhook business logic', {
				eventType: event.type,
				eventId: event.id
			})

			// Handle customer linking
			if (
				event.type === 'customer.created' ||
				event.type === 'customer.updated'
			) {
				await this.linkCustomerToUser(event)
			}

			// Handle subscription access control
			if (!this.accessControlService) {
				this.logger.warn('Access control service not available')
				return
			}

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
						subscription.status === 'incomplete_expired' ||
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

				case 'customer.subscription.trial_will_end': {
					const subscription = event.data.object as Stripe.Subscription
					await this.accessControlService.handleTrialEnding(subscription)
					break
				}

				case 'invoice.payment_failed': {
					const invoice = event.data.object as Stripe.Invoice
					await this.accessControlService.handlePaymentFailed(invoice)
					break
				}

				case 'invoice.payment_succeeded': {
					const invoice = event.data.object as Stripe.Invoice
					await this.accessControlService.handlePaymentSucceeded(invoice)
					break
				}

				default:
					// Event type not handled - this is fine, Sync Engine still processed it
					break
			}
		} catch (error) {
			// Don't throw - this is a best-effort operation
			// The sync engine already succeeded, so we don't want to fail the webhook
			this.logger.error('Error in webhook business logic', {
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	/**
	 * Link customer to user by email
	 */
	private async linkCustomerToUser(event: Stripe.Event) {
		const customer = event.data.object as Stripe.Customer

		// Customer must have an email to link to user
		if (!customer.email) {
			this.logger.warn('Stripe customer has no email, skipping user link', {
				customerId: customer.id
			})
			return
		}

		// Call the PostgreSQL function to link customer to user
		const { data, error } = await this.supabaseService!.rpcWithRetries(
			'link_stripe_customer_to_user',
			{
				p_stripe_customer_id: customer.id,
				p_email: customer.email
			},
			2 // Only 2 attempts for fast failure
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
				userId: data
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
	@Post('stripe-sync')
	@Header('content-type', 'application/json')
	async handleStripeSyncWebhook(@Req() req: RawBodyRequest) {
		if (!this.syncEngine) {
			throw new BadRequestException('Stripe Sync Engine not initialized')
		}

		const signature = req.headers['stripe-signature']

		if (!signature || typeof signature !== 'string') {
			throw new BadRequestException('Missing Stripe signature')
		}

		if (!req.rawBody) {
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
			await this.syncEngine.processWebhook(req.rawBody, signature)

			// Process business logic AFTER sync to ensure stripe.* data exists
			// This includes:
			// - Linking customers to users
			// - Granting/revoking subscription access
			// - Sending email notifications
			await this.processWebhookBusinessLogic(req.rawBody, signature)

			this.logger.log('Stripe webhook processed successfully')

			return { received: true }
		} catch (error) {
			this.logger.error('Failed to process Stripe webhook', {
				error: error instanceof Error ? error.message : 'Unknown error',
				signature: signature.substring(0, 20) + '...'
			})

			// Return 200 to Stripe even on errors to prevent retries
			// Errors are logged for investigation
			return { received: true, error: 'Processing failed' }
		}
	}
}
