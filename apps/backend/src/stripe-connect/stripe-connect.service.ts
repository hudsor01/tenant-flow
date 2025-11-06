import { Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import * as countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'

// Register the English locale to enable country validation
countries.registerLocale(enLocale)

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
	private readonly defaultCountry: string

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService
	) {
		this.stripe = this.stripeClientService.getClient()
		this.defaultCountry = process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || 'US'
	}

	/**
	 * Validates and normalizes a country code to ISO 3166-1 alpha-2 format
	 * @param country The country code to validate and normalize
	 * @returns The normalized country code, or 'US' if invalid/missing
	 */
	private validateAndNormalizeCountry(country: string | undefined): string {
		if (!country) {
			this.logger.warn(
				`Country parameter is missing, falling back to ${this.defaultCountry}`
			)
			return this.defaultCountry
		}

		// Trim whitespace and convert to uppercase
		const normalized = country.trim().toUpperCase()

		// Check if it's a valid ISO 3166-1 alpha-2 code using i18n-iso-countries
		if (normalized.length !== 2 || !countries.isValid(normalized)) {
			this.logger.warn(
				`Invalid country code: ${country}, falling back to ${this.defaultCountry}`
			)
			return this.defaultCountry
		}

		return normalized
	}

	/**
	 * Create a Stripe Connect v2 account for a owner
	 * Uses the Accounts v2 API with marketplace model
	 */
	async createConnectedAccount(
		params: CreateConnectedAccountParams
	): Promise<ConnectedAccountResponse> {
		try {
			// Validate and normalize the country
			const normalizedCountry = this.validateAndNormalizeCountry(params.country)

			// Create Stripe Connect account using v2 API
			const account = await this.stripe.accounts.create({
				type: 'express',
				country: normalizedCountry,
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
				country: normalizedCountry,
				businessType: params.entityType || 'individual',
				chargesEnabled: account.charges_enabled || false,
				payoutsEnabled: account.payouts_enabled || false,
				detailsSubmitted: account.details_submitted || false,
				capabilities: account.capabilities || {}
			}

			const { error: dbError } = await this.supabase
				.getAdminClient()
				.from('connected_account' as never)
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
				.from('connected_account' as never)
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
			.from('connected_account' as never)
			.select('*')
			.eq('userId', userId)
			.single()

		if (error && error.code !== 'PGRST116') {
			throw error
		}

		return data as ConnectedAccountRow | null
	}
}
