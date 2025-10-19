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
	Optional,
	Post,
	Req,
	SetMetadata
} from '@nestjs/common'
import type { Request } from 'express'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeAccessControlService } from '../billing/stripe-access-control.service'
import { StripeSyncService } from '../billing/stripe-sync.service'

// Public decorator for webhook endpoints (bypasses JWT auth)
const Public = () => SetMetadata('isPublic', true)

@Controller('webhooks')
export class StripeSyncController {
	private readonly logger = new Logger(StripeSyncController.name)

	constructor(
		@Inject(StripeSyncService)
		private readonly stripeSyncService: StripeSyncService,
		@Optional() private readonly supabaseService?: SupabaseService,
		@Optional()
		private readonly accessControlService?: StripeAccessControlService
	) {}

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
			const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

			const event: Stripe.Event = stripe.webhooks.constructEvent(
				rawBody,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET!
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
		} catch (error) {
			this.logger.error('Error processing webhook business logic', {
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			// Don't throw - business logic errors shouldn't fail the webhook
		}
	}

	/**
	 * Link Stripe customer to Supabase user by email
	 * Uses the link_stripe_customer_to_user database function
	 */
	private async linkCustomerToUser(event: Stripe.Event) {
		if (!this.supabaseService) {
			this.logger.warn('Supabase service not available for customer linking')
			return
		}

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
