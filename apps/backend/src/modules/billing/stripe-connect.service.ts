import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import Stripe from 'stripe'
import * as countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import { StripeClientService } from '../../shared/stripe-client.service'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Stripe Connect Service
 *
 * Handles Connected Account management for multi-owner SaaS platform
 * - Creates Express Connected Accounts for owners
 * - Manages onboarding with Account Links
 * - Tracks onboarding status
 */
@Injectable()
export class StripeConnectService {
	private readonly logger = new Logger(StripeConnectService.name)
	private stripe: Stripe
	private readonly defaultCountry: string

	// Set of Stripe-supported 2-letter country codes
	private readonly stripeSupportedCountries = new Set([
		'AD',
		'AE',
		'AG',
		'AL',
		'AM',
		'AO',
		'AR',
		'AT',
		'AU',
		'AZ',
		'BA',
		'BB',
		'BD',
		'BE',
		'BF',
		'BG',
		'BH',
		'BI',
		'BJ',
		'BN',
		'BO',
		'BR',
		'BS',
		'BT',
		'BW',
		'BZ',
		'CA',
		'CD',
		'CG',
		'CH',
		'CI',
		'CL',
		'CM',
		'CN',
		'CO',
		'CR',
		'CV',
		'CY',
		'CZ',
		'DE',
		'DJ',
		'DK',
		'DM',
		'DO',
		'DZ',
		'EC',
		'EE',
		'EG',
		'ES',
		'ET',
		'FI',
		'FJ',
		'FM',
		'FR',
		'GA',
		'GB',
		'GD',
		'GE',
		'GH',
		'GM',
		'GN',
		'GQ',
		'GR',
		'GT',
		'GW',
		'GY',
		'HK',
		'HN',
		'HR',
		'HT',
		'HU',
		'ID',
		'IE',
		'IL',
		'IN',
		'IS',
		'IT',
		'JM',
		'JO',
		'JP',
		'KE',
		'KG',
		'KH',
		'KI',
		'KN',
		'KR',
		'KW',
		'KZ',
		'LA',
		'LB',
		'LC',
		'LI',
		'LK',
		'LR',
		'LS',
		'LT',
		'LU',
		'LV',
		'MA',
		'MC',
		'MD',
		'ME',
		'MG',
		'MH',
		'MK',
		'ML',
		'MM',
		'MN',
		'MO',
		'MR',
		'MT',
		'MU',
		'MV',
		'MW',
		'MX',
		'MY',
		'MZ',
		'NA',
		'NE',
		'NG',
		'NI',
		'NL',
		'NO',
		'NP',
		'NR',
		'NZ',
		'OM',
		'PA',
		'PE',
		'PG',
		'PH',
		'PK',
		'PL',
		'PT',
		'PW',
		'PY',
		'QA',
		'RO',
		'RS',
		'RW',
		'SA',
		'SB',
		'SC',
		'SE',
		'SG',
		'SI',
		'SK',
		'SL',
		'SM',
		'SN',
		'SR',
		'ST',
		'SV',
		'SZ',
		'TD',
		'TG',
		'TH',
		'TJ',
		'TL',
		'TN',
		'TO',
		'TR',
		'TT',
		'TV',
		'TW',
		'TZ',
		'UA',
		'UG',
		'US',
		'UY',
		'UZ',
		'VC',
		'VN',
		'VU',
		'WS',
		'ZA',
		'ZM',
		'ZW'
	])

	constructor(
		private readonly stripeClientService: StripeClientService,
		private readonly supabaseService: SupabaseService
	) {
		// Register the English locale to enable country validation
		countries.registerLocale(enLocale)

		this.stripe = this.stripeClientService.getClient()
		this.defaultCountry =
			this.normalizeCountryCode(process.env.STRIPE_CONNECT_DEFAULT_COUNTRY) ??
			'US'
	}

	/**
	 * Get the Stripe instance for direct API access
	 */
	getStripe(): Stripe {
		return this.stripe
	}

	/**
	 * Create a Stripe Connected Account for a owner
	 * Uses Express account type with Stripe-managed onboarding
	 */
	async createConnectedAccount(params: {
		userId: string
		email: string
		firstName?: string
		lastName?: string
		country?: string
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
			const normalizedCountry = this.normalizeCountryCode(params.country)
			const accountCountry = normalizedCountry ?? this.defaultCountry
			if (params.country && !normalizedCountry) {
				this.logger.warn('Provided country code is invalid, using default', {
					userId: params.userId,
					providedCountry: params.country,
					defaultCountry: accountCountry
				})
			} else if (!params.country) {
				this.logger.debug('Falling back to default Stripe country', {
					userId: params.userId,
					defaultCountry: accountCountry
				})
			}

			// Create Express Connected Account with idempotency key
			const account = await this.stripe.accounts.create(
				{
					type: 'express',
					country: accountCountry,
					email: params.email,
					capabilities: {
					card_payments: { requested: true },
					transfers: { requested: true }
				},
				tos_acceptance: {
					service_agreement: 'full'
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
						platform: 'tenantflow',
						country: accountCountry
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
				await this.cleanupStripeAccount(
					account.id,
					'after database update failure'
				)
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
				await this.cleanupStripeAccount(stripeAccountId, 'after error')
			}

			throw error
		}
	}

	private normalizeCountryCode(country?: string | null): string | null {
		if (!country) {
			return null
		}

		const trimmed = country.trim()
		if (!trimmed) {
			return null
		}

		const code = trimmed.toUpperCase()

		// First check if format is valid (2-letter code)
		if (!/^[A-Z]{2}$/.test(code)) {
			return null
		}

		// Then check if Stripe supports this country
		if (!this.stripeSupportedCountries.has(code)) {
			// Log warning but return null to trigger fallback
			this.logger.warn('Unsupported country code for Stripe Connect', {
				country: code,
				message: 'Stripe does not support this country for Express accounts'
			})
			return null
		}

		return code
	}

	/**
	 * Cleanup orphaned Stripe account
	 * @private
	 */
	private async cleanupStripeAccount(
		accountId: string,
		context: string
	): Promise<void> {
		try {
			await this.stripe.accounts.del(accountId)
			this.logger.log(`Cleaned up orphaned Stripe account ${context}`, {
				accountId,
				context
			})
		} catch (deleteError) {
			this.logger.error(`Failed to cleanup Stripe account ${context}`, {
				error: deleteError,
				accountId,
				context
			})
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

		// Validate URL format
		try {
			const url = new URL(frontendUrl)
			if (url.protocol !== 'http:' && url.protocol !== 'https:') {
				const error = `FRONTEND_URL must use http or https protocol, got: ${url.protocol}`
				this.logger.error(error, { accountId, frontendUrl })
				throw new Error(error)
			}
		} catch (urlError) {
			const error = `Invalid FRONTEND_URL format: ${frontendUrl}`
			this.logger.error(error, { accountId, urlError })
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
	 * Create dashboard login link for connected account
	 */
	async createDashboardLoginLink(connectedAccountId: string): Promise<string> {
		try {
			const loginLink =
				await this.stripe.accounts.createLoginLink(connectedAccountId)
			return loginLink.url
		} catch (error) {
			this.logger.error('Failed to create dashboard login link', {
				error,
				connectedAccountId
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

			// Fetch existing user to check current onboardingCompletedAt
			const { data: existingUser, error: fetchError } =
				await this.supabaseService
					.getAdminClient()
					.from('users')
					.select('onboardingCompletedAt')
					.eq('id', userId)
					.single()

			if (fetchError) {
				this.logger.error(
					'Failed to fetch existing user for onboarding status',
					{
						error: fetchError,
						userId
					}
				)
				throw fetchError
			}

			const isNowComplete = account.charges_enabled && account.payouts_enabled
			const existingTimestamp = existingUser?.onboardingCompletedAt

			// Only set timestamp if:
			// 1. Account is now complete AND existing timestamp is falsy (first completion)
			// 2. Account is not complete -> null (allow re-onboarding)
			let onboardingCompletedAt: string | null
			if (isNowComplete) {
				// Preserve existing timestamp on re-completion, set new timestamp on first completion
				onboardingCompletedAt = existingTimestamp ?? new Date().toISOString()
			} else {
				// Clear timestamp when account is not complete (allow re-onboarding)
				onboardingCompletedAt = null
			}

			const { error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.update({
					onboardingComplete: isNowComplete,
					detailsSubmitted: account.details_submitted,
					chargesEnabled: account.charges_enabled,
					payoutsEnabled: account.payouts_enabled,
					onboardingCompletedAt
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
