import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { SubscriptionSupabaseRepository } from './subscription-supabase.repository'

/**
 * Minimal Payment Recovery Service
 *
 * Since we use Stripe's native payment recovery features, this service
 * only syncs subscription status with our database. Stripe handles:
 * - Smart Retries (AI-powered retry scheduling)
 * - Customer emails for failed payments
 * - Automatic card updates
 * - All recovery logic
 *
 * Configure in Stripe Dashboard:
 * - dashboard.stripe.com/revenue_recovery/retries (Smart Retries)
 * - dashboard.stripe.com/revenue_recovery/emails (Customer Emails)
 *
 * @see https://docs.stripe.com/billing/revenue-recovery
 */
@Injectable()
export class PaymentRecoveryService {
	constructor(
		private readonly subscriptionRepository: SubscriptionSupabaseRepository,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	/**
	 * Sync failed payment status from Stripe webhook
	 * Stripe handles all retry logic automatically
	 */
	async handlePaymentFailure(
		invoice: Record<string, unknown>
	): Promise<void> {
		const subscriptionId = invoice.subscription as string
		if (!subscriptionId) {
			return
		}

		await this.subscriptionRepository.updateStatusByStripeId(
			subscriptionId,
			'PAST_DUE'
		)

		this.logger.info(
			`Subscription ${subscriptionId} marked PAST_DUE. Stripe handling recovery.`
		)
	}

	/**
	 * Sync recovered payment status from Stripe webhook
	 */
	async handlePaymentRecovered(
		invoice: Record<string, unknown>
	): Promise<void> {
		const subscriptionId = invoice.subscription as string
		if (!subscriptionId) {
			return
		}

		await this.subscriptionRepository.updateStatusByStripeId(
			subscriptionId,
			'ACTIVE'
		)

		this.logger.info(
			`Subscription ${subscriptionId} recovered and marked ACTIVE.`
		)
	}
}
