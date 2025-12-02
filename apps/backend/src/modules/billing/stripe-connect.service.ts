import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { ConnectSetupService } from './connect-setup.service'
import { ConnectBillingService } from './connect-billing.service'
import { ConnectPayoutsService } from './connect-payouts.service'

/**
 * Stripe Connect Service (Facade)
 *
 * Delegates to focused services:
 * - ConnectSetupService: Account creation and onboarding
 * - ConnectBillingService: Customer and subscription management
 * - ConnectPayoutsService: Balance, payouts, and transfers
 */
@Injectable()
export class StripeConnectService {
	constructor(
		private readonly setupService: ConnectSetupService,
		private readonly billingService: ConnectBillingService,
		private readonly payoutsService: ConnectPayoutsService
	) {}

	// ============ Setup Service Delegation ============

	/** Get the Stripe instance for direct API access */
	getStripe(): Stripe {
		return this.setupService.getStripe()
	}

	/** Create a Stripe Connected Account for a property owner */
	async createConnectedAccount(params: {
		user_id: string
		email: string
		first_name?: string
		last_name?: string
		country?: string
	}): Promise<{ accountId: string; onboardingUrl: string }> {
		return this.setupService.createConnectedAccount(params)
	}

	/** Create an Account Link for onboarding */
	async createAccountLink(accountId: string): Promise<Stripe.AccountLink> {
		return this.setupService.createAccountLink(accountId)
	}

	/** Get Connected Account details */
	async getConnectedAccount(accountId: string): Promise<Stripe.Account> {
		return this.setupService.getConnectedAccount(accountId)
	}

	/** Update property owner onboarding status based on Stripe Account */
	async updateOnboardingStatus(user_id: string, accountId: string): Promise<void> {
		return this.setupService.updateOnboardingStatus(user_id, accountId)
	}

	// ============ Billing Service Delegation ============

	/** Create a Stripe customer on a connected account */
	async createCustomerOnConnectedAccount(
		connectedAccountId: string,
		params: {
			email: string
			name?: string
			phone?: string
			metadata?: Record<string, string>
		}
	): Promise<Stripe.Customer> {
		return this.billingService.createCustomerOnConnectedAccount(connectedAccountId, params)
	}

	/** Create a Stripe subscription on a connected account */
	async createSubscriptionOnConnectedAccount(
		connectedAccountId: string,
		params: {
			customerId: string
			rentAmount: number
			currency?: string
			metadata?: Record<string, string>
			idempotencyKey?: string
		}
	): Promise<Stripe.Subscription> {
		return this.billingService.createSubscriptionOnConnectedAccount(connectedAccountId, params)
	}

	/** Delete a customer on a connected account (SAGA compensation) */
	async deleteCustomer(
		customerId: string,
		connectedAccountId: string
	): Promise<Stripe.DeletedCustomer> {
		return this.billingService.deleteCustomer(customerId, connectedAccountId)
	}

	/** Cancel a subscription on a connected account (SAGA compensation) */
	async cancelSubscription(
		subscriptionId: string,
		connectedAccountId: string
	): Promise<Stripe.Subscription> {
		return this.billingService.cancelSubscription(subscriptionId, connectedAccountId)
	}

	// ============ Payouts Service Delegation ============

	/** Get balance for a connected account */
	async getConnectedAccountBalance(stripeAccountId: string): Promise<Stripe.Balance> {
		return this.payoutsService.getConnectedAccountBalance(stripeAccountId)
	}

	/** List payouts for a connected account */
	async listConnectedAccountPayouts(
		stripeAccountId: string,
		options?: { limit?: number; starting_after?: string }
	): Promise<Stripe.ApiList<Stripe.Payout>> {
		return this.payoutsService.listConnectedAccountPayouts(stripeAccountId, options)
	}

	/** Get details of a specific payout */
	async getPayoutDetails(
		stripeAccountId: string,
		payoutId: string
	): Promise<Stripe.Payout> {
		return this.payoutsService.getPayoutDetails(stripeAccountId, payoutId)
	}

	/** List transfers to a connected account (rent payments received) */
	async listTransfersToAccount(
		stripeAccountId: string,
		options?: { limit?: number; starting_after?: string }
	): Promise<Stripe.ApiList<Stripe.Transfer>> {
		return this.payoutsService.listTransfersToAccount(stripeAccountId, options)
	}

	/** Create dashboard login link for connected account */
	async createDashboardLoginLink(connectedAccountId: string): Promise<string> {
		return this.payoutsService.createDashboardLoginLink(connectedAccountId)
	}
}
