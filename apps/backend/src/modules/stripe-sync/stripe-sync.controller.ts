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
import { SupabaseService } from '../../database/supabase.service'
import type { RawBodyRequest } from '../../shared/types/express-request.types'

// Public decorator for webhook endpoints (bypasses JWT auth)
const Public = () => SetMetadata('isPublic', true)

// Type definition for Stripe Sync Engine (will be installed via pnpm)
interface StripeSyncEngine {
	processWebhook(rawBody: Buffer, signature: string): Promise<void>
}

@Controller('webhooks')
export class StripeSyncController {
	private readonly logger = new Logger(StripeSyncController.name)
	private syncEngine: StripeSyncEngine | null = null

	constructor(@Optional() private readonly supabaseService?: SupabaseService) {
		// Initialize Stripe Sync Engine
		if (this.supabaseService) {
			try {
				// Dynamic import to handle package installation
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const { StripeSyncEngine } = require('@supabase/stripe-sync-engine')

				this.syncEngine = new StripeSyncEngine({
					apiKey: process.env.STRIPE_SECRET_KEY!,
					db: this.supabaseService.getAdminClient()
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
	 * Link Stripe customer to Supabase user
	 * Called after Sync Engine processes webhook to maintain user_id mapping
	 */
	private async linkCustomerToUser(rawBody: Buffer, signature: string) {
		try {
			// We need to parse the event again to get the event type
			// This is safe because Sync Engine already validated the signature
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const Stripe = require('stripe')
			const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

			const event = stripe.webhooks.constructEvent(
				rawBody,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET
			)

			// Only process customer.created and customer.updated events
			if (
				event.type !== 'customer.created' &&
				event.type !== 'customer.updated'
			) {
				return
			}

			const customer = event.data.object

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
		} catch (error) {
			// Don't throw - this is a best-effort operation
			// The sync engine already succeeded, so we don't want to fail the webhook
			this.logger.error('Error in linkCustomerToUser', {
				error: error instanceof Error ? error.message : 'Unknown error'
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

			// Parse the event to link customers to users
			// This happens AFTER sync to ensure stripe.customers exists
			await this.linkCustomerToUser(req.rawBody, signature)

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
