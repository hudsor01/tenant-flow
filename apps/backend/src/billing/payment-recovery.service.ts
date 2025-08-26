import { Injectable, Logger } from '@nestjs/common'
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
	private readonly logger = new Logger(PaymentRecoveryService.name)

	constructor(
		private readonly subscriptionRepository: SubscriptionSupabaseRepository
	) {}

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

		this.logger.log(
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

		this.logger.log(
			`Subscription ${subscriptionId} recovered and marked ACTIVE.`
		)
	}
}
