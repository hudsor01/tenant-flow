import { Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'

export interface CreateConnectedAccountParams {
	userId: string
	email: string
	displayName: string
	businessName?: string
	country?: string
	entityType?: 'individual' | 'company'
}

export interface ConnectedAccountResponse {
	accountId: string
	onboardingUrl: string
	status: string
}

export interface ConnectedAccountRow {
	id: string
	userId: string
	stripeAccountId: string
	accountType: string
	accountStatus: string
	chargesEnabled: boolean
	payoutsEnabled: boolean
	detailsSubmitted: boolean
	displayName: string | null
	contactEmail: string | null
	country: string | null
	currency: string | null
	businessType: string | null
	onboardingCompleted: boolean
	onboardingCompletedAt: string | null
	capabilities: Record<string, unknown>
	requirements: Record<string, unknown>
	createdAt: string
	updatedAt: string
}

@Injectable()
export class StripeConnectService {
	private readonly stripe: Stripe
	private readonly logger = new Logger(StripeConnectService.name)

	constructor(private readonly supabase: SupabaseService) {
		const apiKey = process.env.STRIPE_SECRET_KEY
		if (!apiKey) {
			throw new Error('STRIPE_SECRET_KEY environment variable is required')
		}
		this.stripe = new Stripe(apiKey, {
			apiVersion: '2025-08-27' as Stripe.LatestApiVersion
		})
	}

	/**
	 * Create a Stripe Connect v2 account for a landlord
	 * Uses the Accounts v2 API with marketplace model
	 */
	async createConnectedAccount(
		params: CreateConnectedAccountParams
	): Promise<ConnectedAccountResponse> {
		try {
			// Create Stripe Connect account using v2 API
			const account = await this.stripe.accounts.create({
				type: 'express',
				country: params.country || 'US',
				email: params.email,
				business_type: params.entityType || 'individual',
				business_profile: {
					name: params.businessName || params.displayName
				},
				capabilities: {
					card_payments: { requested: true },
					transfers: { requested: true }
				},
				metadata: {
					userId: params.userId,
					platform: 'tenantflow'
				}
			})

			const insertData = {
				userId: params.userId,
				stripeAccountId: account.id,
				accountType: 'express',
				accountStatus: 'pending',
				displayName: params.displayName,
				contactEmail: params.email,
				country: params.country || 'US',
				businessType: params.entityType || 'individual',
				chargesEnabled: account.charges_enabled || false,
				payoutsEnabled: account.payouts_enabled || false,
				detailsSubmitted: account.details_submitted || false,
				capabilities: account.capabilities || {}
			}

			const { error: dbError } = await this.supabase
				.getAdminClient()
				.from('ConnectedAccount' as never)
				.insert(insertData as never)

			if (dbError) {
				this.logger.error('Failed to store connected account:', dbError)
				throw new Error('Failed to store connected account')
			}

			// Create account link for onboarding
			const accountLink = await this.stripe.accountLinks.create({
				account: account.id,
				refresh_url: `${process.env.FRONTEND_URL}/settings/connect/refresh`,
				return_url: `${process.env.FRONTEND_URL}/settings/connect/success`,
				type: 'account_onboarding'
			})

			return {
				accountId: account.id,
				onboardingUrl: accountLink.url,
				status: 'pending'
			}
		} catch (error) {
			this.logger.error('Failed to create connected account:', error)
			throw error
		}
	}

	/**
	 * Get connected account details from Stripe
	 */
	async getConnectedAccount(accountId: string): Promise<Stripe.Account> {
		return await this.stripe.accounts.retrieve(accountId)
	}

	/**
	 * Update connected account in database from Stripe webhook
	 */
	async updateConnectedAccountFromWebhook(accountId: string): Promise<void> {
		try {
			const account = await this.getConnectedAccount(accountId)

			const updateData: Record<string, unknown> = {
				accountStatus: account.charges_enabled ? 'active' : 'pending',
				chargesEnabled: account.charges_enabled || false,
				payoutsEnabled: account.payouts_enabled || false,
				detailsSubmitted: account.details_submitted || false,
				capabilities: account.capabilities || {},
				requirements: account.requirements || {},
				updatedAt: new Date().toISOString()
			}

			// Mark onboarding as complete if all requirements met
			if (account.details_submitted && account.charges_enabled) {
				updateData.onboardingCompleted = true
				updateData.onboardingCompletedAt = new Date().toISOString()
			}

			const { error } = await this.supabase
				.getAdminClient()
				.from('ConnectedAccount' as never)
				.update(updateData as never)
				.eq('stripeAccountId', accountId)

			if (error) {
				this.logger.error('Failed to update connected account:', error)
				throw error
			}

			this.logger.log(`Updated connected account ${accountId} from webhook`)
		} catch (error) {
			this.logger.error(
				`Failed to update connected account ${accountId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Get or refresh account link for onboarding
	 */
	async createAccountLink(accountId: string): Promise<string> {
		const accountLink = await this.stripe.accountLinks.create({
			account: accountId,
			refresh_url: `${process.env.FRONTEND_URL}/settings/connect/refresh`,
			return_url: `${process.env.FRONTEND_URL}/settings/connect/success`,
			type: 'account_onboarding'
		})

		return accountLink.url
	}

	/**
	 * Check if user has a connected account
	 */
	async getUserConnectedAccount(
		userId: string
	): Promise<ConnectedAccountRow | null> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('ConnectedAccount' as never)
			.select('*')
			.eq('userId', userId)
			.single()

		if (error && error.code !== 'PGRST116') {
			throw error
		}

		return data as ConnectedAccountRow | null
	}
}
