import { Injectable } from '@nestjs/common'
import { Stripe } from 'stripe'
import { AppConfigService } from '../config/app-config.service'
import { AppLogger } from '../logger/app-logger.service'

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

	constructor(
		private readonly config: AppConfigService,
		private readonly logger: AppLogger
	) {
		const stripeSecretKey = this.config.getStripeSecretKey()

		// Initialize Stripe client with recommended configuration
		// Using pinned API version to prevent breaking changes (2025 best practice)
		this.stripe = new Stripe(stripeSecretKey, {
			apiVersion: '2025-12-15.clover',
			typescript: true,
			maxNetworkRetries: 2 // Automatic exponential backoff on transient failures
		})

		// Attach SDK event listeners for monitoring
		this.setupMonitoring()
	}

	/**
	 * Set up SDK event listeners for API call monitoring
	 * Logs all API interactions with timing, status, and request IDs
	 */
	private setupMonitoring(): void {
		this.stripe.on('response', response => {
			const { method, path, status, elapsed, request_id } = response

			this.logger.log('Stripe API response', {
				method,
				path,
				status,
				requestId: request_id,
				elapsedMs: elapsed
			})

			// Warn on slow requests (>2 seconds)
			if (elapsed > 2000) {
				this.logger.warn('Slow Stripe request', {
					path,
					elapsedMs: elapsed,
					requestId: request_id
				})
			}

			// Error on rate limit hits
			if (status === 429) {
				this.logger.error('Stripe rate limit hit', {
					path,
					requestId: request_id
				})
			}
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
