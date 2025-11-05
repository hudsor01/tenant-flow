import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import Stripe from 'stripe'
import { StripeClientService } from '../../shared/stripe-client.service'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Stripe Connect Service
 *
 * Handles Connected Account management for multi-landlord SaaS platform
 * - Creates Express Connected Accounts for landlords
 * - Manages onboarding with Account Links
 * - Tracks onboarding status
 */
@Injectable()
export class StripeConnectService {
	private readonly logger = new Logger(StripeConnectService.name)
	private stripe: Stripe

	constructor(
		private readonly stripeClientService: StripeClientService,
		private readonly supabaseService: SupabaseService
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Get the Stripe instance for direct API access
	 */
	getStripe(): Stripe {
		return this.stripe
	}

	/**
	 * Create a Stripe Connected Account for a landlord
	 * Uses Express account type with Stripe-managed onboarding
	 */
	async createConnectedAccount(params: {
		userId: string
		email: string
		firstName?: string
		lastName?: string
	}): Promise<{ accountId: string; onboardingUrl: string }> {
		// Check if user already has a connected account (idempotent)
		const { data: existingUser, error: fetchError } = await this.supabaseService
			.getAdminClient()
			.from('users')
			.select('connectedAccountId')
			.eq('id', params.userId)
			.single()

		if (fetchError) {
			this.logger.error('Failed to fetch user', {
				error: fetchError,
				userId: params.userId
			})
			throw new BadRequestException('Failed to fetch user')
		}

		if (existingUser?.connectedAccountId) {
			this.logger.log('User already has connected account', {
				userId: params.userId,
				accountId: existingUser.connectedAccountId
			})
			const accountLink = await this.createAccountLink(
				existingUser.connectedAccountId
			)
			return {
				accountId: existingUser.connectedAccountId,
				onboardingUrl: accountLink.url
			}
		}

		let stripeAccountId: string | null = null

		try {
			// Create Express Connected Account with idempotency key
			const account = await this.stripe.accounts.create(
				{
					type: 'express',
					country: 'US', // TODO: Make configurable based on property owner location
					email: params.email,
					capabilities: {
						card_payments: { requested: true },
						transfers: { requested: true }
					},
					business_type: 'individual',
					settings: {
						payouts: {
							schedule: {
								interval: 'monthly',
								monthly_anchor: 1
							}
						}
					},
					metadata: {
						userId: params.userId,
						platform: 'tenantflow'
					}
				},
				{
					idempotencyKey: `create_account_${params.userId}`
				}
			)

			stripeAccountId = account.id

			this.logger.log('Created Connected Account', {
				userId: params.userId,
				accountId: account.id
			})

			// Store connectedAccountId in database
			const { error: updateError } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.update({
					connectedAccountId: account.id
				})
				.eq('id', params.userId)

			if (updateError) {
				this.logger.error('Failed to save connectedAccountId', {
					error: updateError,
					userId: params.userId,
					accountId: account.id
				})
				// Cleanup: Delete the Stripe account since DB update failed
				try {
					await this.stripe.accounts.del(account.id)
					this.logger.log('Cleaned up orphaned Stripe account', {
						accountId: account.id
					})
				} catch (deleteError) {
					this.logger.error('Failed to cleanup Stripe account', {
						error: deleteError,
						accountId: account.id
					})
				}
				throw new BadRequestException('Failed to save account')
			}

			// Create Account Link for onboarding
			const accountLink = await this.createAccountLink(account.id)

			return {
				accountId: account.id,
				onboardingUrl: accountLink.url
			}
		} catch (error) {
			this.logger.error('Failed to create Connected Account', {
				error,
				userId: params.userId,
				stripeAccountId
			})

			// Cleanup orphaned Stripe account if it was created
			if (stripeAccountId) {
				try {
					await this.stripe.accounts.del(stripeAccountId)
					this.logger.log('Cleaned up orphaned Stripe account after error', {
						accountId: stripeAccountId
					})
				} catch (deleteError) {
					this.logger.error('Failed to cleanup Stripe account after error', {
						error: deleteError,
						accountId: stripeAccountId
					})
				}
			}

			throw error
		}
	}

	/**
	 * Create an Account Link for onboarding
	 */
	async createAccountLink(accountId: string): Promise<Stripe.AccountLink> {
		// Validate FRONTEND_URL
		const frontendUrl = process.env.FRONTEND_URL?.trim()
		if (!frontendUrl) {
			const error = 'FRONTEND_URL environment variable is not set'
			this.logger.error(error, { accountId })
			throw new Error(error)
		}

		// Remove trailing slashes
		const baseUrl = frontendUrl.replace(/\/+$/, '')

		try {
			const accountLink = await this.stripe.accountLinks.create({
				account: accountId,
				refresh_url: `${baseUrl}/settings/billing?refresh=true`,
				return_url: `${baseUrl}/settings/billing?success=true`,
				type: 'account_onboarding'
			})

			this.logger.log('Created Account Link', { accountId })

			return accountLink
		} catch (error) {
			this.logger.error('Failed to create Account Link', { error, accountId })
			throw error
		}
	}

	/**
	 * Get Connected Account details
	 */
	async getConnectedAccount(accountId: string): Promise<Stripe.Account> {
		try {
			const account = await this.stripe.accounts.retrieve(accountId)
			return account
		} catch (error) {
			this.logger.error('Failed to retrieve Connected Account', {
				error,
				accountId
			})
			throw error
		}
	}

	/**
	 * Update user onboarding status based on Stripe Account
	 */
	async updateOnboardingStatus(
		userId: string,
		accountId: string
	): Promise<void> {
		try {
			const account = await this.getConnectedAccount(accountId)

			const { error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.update({
					onboardingComplete:
						account.charges_enabled && account.payouts_enabled,
					detailsSubmitted: account.details_submitted,
					chargesEnabled: account.charges_enabled,
					payoutsEnabled: account.payouts_enabled,
					onboardingCompletedAt:
						account.charges_enabled && account.payouts_enabled
							? new Date().toISOString()
							: null
				})
				.eq('id', userId)

			if (error) {
				this.logger.error('Failed to update onboarding status', {
					error,
					userId
				})
				throw error
			}

			this.logger.log('Updated onboarding status', {
				userId,
				accountId,
				onboardingComplete: account.charges_enabled && account.payouts_enabled
			})
		} catch (error) {
			this.logger.error('Failed to update onboarding status', {
				error,
				userId,
				accountId
			})
			throw error
		}
	}
}
