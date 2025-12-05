import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeClientService } from '../../shared/stripe-client.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Stripe Connect Payouts Service
 *
 * Handles financial reporting for connected accounts
 * - Balance retrieval
 * - Payout listing and details
 * - Transfer tracking
 * - Dashboard access
 */
@Injectable()
export class ConnectPayoutsService {
	private stripe: Stripe

	constructor(private readonly stripeClientService: StripeClientService, private readonly logger: AppLogger) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Get balance for a connected account
	 * Returns available and pending balance amounts
	 */
	async getConnectedAccountBalance(stripeAccountId: string): Promise<Stripe.Balance> {
		this.logger.log('Fetching connected account balance', { stripeAccountId })
		return this.stripe.balance.retrieve({ stripeAccount: stripeAccountId })
	}

	/**
	 * List payouts for a connected account
	 */
	async listConnectedAccountPayouts(
		stripeAccountId: string,
		options?: { limit?: number; starting_after?: string }
	): Promise<Stripe.ApiList<Stripe.Payout>> {
		this.logger.log('Listing connected account payouts', {
			stripeAccountId,
			limit: options?.limit
		})

		return this.stripe.payouts.list(
			{
				limit: options?.limit || 10,
				...(options?.starting_after && { starting_after: options.starting_after })
			},
			{ stripeAccount: stripeAccountId }
		)
	}

	/**
	 * Get details of a specific payout
	 */
	async getPayoutDetails(
		stripeAccountId: string,
		payoutId: string
	): Promise<Stripe.Payout> {
		this.logger.log('Fetching payout details', { stripeAccountId, payoutId })
		return this.stripe.payouts.retrieve(payoutId, { stripeAccount: stripeAccountId })
	}

	/**
	 * List transfers to a connected account (rent payments received)
	 */
	async listTransfersToAccount(
		stripeAccountId: string,
		options?: { limit?: number; starting_after?: string }
	): Promise<Stripe.ApiList<Stripe.Transfer>> {
		this.logger.log('Listing transfers to connected account', {
			stripeAccountId,
			limit: options?.limit
		})

		return this.stripe.transfers.list({
			destination: stripeAccountId,
			limit: options?.limit || 10,
			...(options?.starting_after && { starting_after: options.starting_after })
		})
	}

	/**
	 * Create dashboard login link for connected account
	 */
	async createDashboardLoginLink(connectedAccountId: string): Promise<string> {
		try {
			const loginLink = await this.stripe.accounts.createLoginLink(connectedAccountId)
			return loginLink.url
		} catch (error) {
			this.logger.error('Failed to create dashboard login link', {
				error,
				connectedAccountId
			})
			throw error
		}
	}
}