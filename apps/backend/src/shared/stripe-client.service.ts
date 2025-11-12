import { Injectable } from '@nestjs/common'
import { Stripe } from 'stripe'
import { AppConfigService } from '../config/app-config.service'

/**
 * Centralized Stripe Client Service
 *
 * Single source of truth for Stripe client configuration across all backend services.
 * Uses NestJS dependency injection to provide a singleton Stripe client instance.
 *
 * CLAUDE.MD compliant: Native platform integration, no custom abstractions.
 */
@Injectable()
export class StripeClientService {
	private readonly stripe: Stripe

	constructor(private readonly config: AppConfigService) {
		const stripeSecretKey = this.config.getStripeSecretKey()

		// Initialize Stripe client with recommended configuration
		// Using pinned API version to prevent breaking changes (2025 best practice)
		this.stripe = new Stripe(stripeSecretKey, {
			apiVersion: '2025-10-29.clover',
			typescript: true
		})
	}

	/**
	 * Get the singleton Stripe client instance
	 * @returns Configured Stripe client
	 */
	getClient(): Stripe {
		return this.stripe
	}

	/**
	 * Construct webhook event from raw body and signature
	 * Includes 5-minute tolerance to prevent replay attacks (Stripe 2025 best practice)
	 * @param rawBody - Raw request body
	 * @param signature - Stripe-Signature header value
	 * @param webhookSecret - Webhook endpoint secret
	 * @returns Validated Stripe event
	 */
	constructWebhookEvent(
		rawBody: string | Buffer,
		signature: string,
		webhookSecret: string
	): Stripe.Event {
		return this.stripe.webhooks.constructEvent(
			rawBody,
			signature,
			webhookSecret,
			300 // 5 minutes tolerance - prevents replay attacks
		)
	}
}
