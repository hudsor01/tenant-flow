import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import Stripe from 'stripe'
import * as countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import { StripeClientService } from '../../shared/stripe-client.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppConfigService } from '../../config/app-config.service'

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
		private readonly supabaseService: SupabaseService,
		private readonly appConfigService: AppConfigService
	) {
		// Register the English locale to enable country validation
		countries.registerLocale(enLocale)

		this.stripe = this.stripeClientService.getClient()
		this.defaultCountry =
			this.normalizeCountryCode(this.appConfigService.getStripeConnectDefaultCountry()) ??
			'US'
	}

	/**
	 * Get the Stripe instance for direct API access
	 */
	getStripe(): Stripe {
		return this.stripe
	}

	/**
	 * Create a Stripe customer on a connected account
	 * Used for tenant billing when they're added to a lease on a property with a connected account
	 */
	async createCustomerOnConnectedAccount(
		connectedAccountId: string,
		params: {
			email: string
			name?: string
			phone?: string
			metadata?: Record<string, string>
		}
	): Promise<Stripe.Customer> {
		try {
			const customer = await this.stripe.customers.create(
				{
					email: params.email,
					...(params.name && { name: params.name }),
					...(params.phone && { phone: params.phone }),
					metadata: {
						platform: 'tenantflow',
						...params.metadata
					}
				},
				{
					stripeAccount: connectedAccountId
				}
			)

			this.logger.log('Created Stripe customer on connected account', {
				customer_id: customer.id,
				stripe_account_id: connectedAccountId,
				email: customer.email
			})

			return customer
		} catch (error) {
			this.logger.error('Failed to create Stripe customer on connected account', {
				error: error instanceof Error ? error.message : String(error),
				stripe_account_id: connectedAccountId,
				email: params.email
			})
			throw error
		}
	}

	/**
	 * Create a Stripe subscription on a connected account
	 * Used for setting up recurring rent payments for tenants
	 */
	async createSubscriptionOnConnectedAccount(
		connectedAccountId: string,
		params: {
			customerId: string
			rentAmount: number // in cents
			currency?: string
			metadata?: Record<string, string>
		}
	): Promise<Stripe.Subscription> {
		try {
			// First, create a price object for the monthly rent
			const price = await this.stripe.prices.create(
				{
					currency: params.currency || 'usd',
					unit_amount: params.rentAmount,
					recurring: { interval: 'month' },
					product_data: {
						name: 'Monthly Rent Payment'
					}
				},
				{
					stripeAccount: connectedAccountId
				}
			)

			// Create subscription with the price
			const subscription = await this.stripe.subscriptions.create(
				{
					customer: params.customerId,
					items: [{ price: price.id }],
					payment_behavior: 'default_incomplete',
					expand: ['latest_invoice.payment_intent'],
					metadata: {
						platform: 'tenantflow',
						...params.metadata
					}
				},
				{
					stripeAccount: connectedAccountId
				}
			)

			this.logger.log('Created Stripe subscription on connected account', {
				subscription_id: subscription.id,
				customer_id: params.customerId,
				stripe_account_id: connectedAccountId,
				rent_amount: params.rentAmount
			})

			return subscription
		} catch (error) {
			this.logger.error('Failed to create Stripe subscription on connected account', {
				error: error instanceof Error ? error.message : String(error),
				stripe_account_id: connectedAccountId,
				customer_id: params.customerId,
				rent_amount: params.rentAmount
			})
			throw error
		}
	}

	/**
	 * Create a Stripe Connected Account for a owner
	 * Uses Express account type with Stripe-managed onboarding
	 */
	async createConnectedAccount(params: {
		user_id: string
		email: string
		first_name?: string
		last_name?: string
		country?: string
	}): Promise<{ accountId: string; onboardingUrl: string }> {
		// Check if user already has a connected account (idempotent)
		const { data: existingUser, error: fetchError } = await this.supabaseService
			.getAdminClient()
			.from('users')
			.select('connected_account_id')
			.eq('id', params.user_id)
			.single()

		if (fetchError) {
			this.logger.error('Failed to fetch user', {
				error: fetchError,
				user_id: params.user_id
			})
			throw new BadRequestException('Failed to fetch user')
		}

		if (existingUser?.connected_account_id) {
			this.logger.log('User already has connected account', {
				user_id: params.user_id,
				accountId: existingUser.connected_account_id
			})
			const accountLink = await this.createAccountLink(
				existingUser.connected_account_id
			)
			return {
				accountId: existingUser.connected_account_id,
				onboardingUrl: accountLink.url
			}
		}

		let stripeAccountId: string | null = null

		try {
			const normalizedCountry = this.normalizeCountryCode(params.country)
			const accountCountry = normalizedCountry ?? this.defaultCountry
			if (params.country && !normalizedCountry) {
				this.logger.warn('Provided country code is invalid, using default', {
					user_id: params.user_id,
					providedCountry: params.country,
					defaultCountry: accountCountry
				})
			} else if (!params.country) {
				this.logger.debug('Falling back to default Stripe country', {
					user_id: params.user_id,
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
						user_id: params.user_id,
						platform: 'tenantflow',
						country: accountCountry
					}
				},
				{
					idempotencyKey: `create_account_${params.user_id}`
				}
			)

			stripeAccountId = account.id

			this.logger.log('Created Connected Account', {
				user_id: params.user_id,
				accountId: account.id
			})

			// Store connectedAccountId in database
			const { error: updateError } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.update({
					connected_account_id: account.id
				})
				.eq('id', params.user_id)

			if (updateError) {
				this.logger.error('Failed to save connectedAccountId', {
					error: updateError,
					user_id: params.user_id,
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
				user_id: params.user_id,
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
		const frontendUrl = this.appConfigService.getFrontendUrl()

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
		user_id: string,
		accountId: string
	): Promise<void> {
		try {
			const account = await this.getConnectedAccount(accountId)

			// Fetch existing user to check current onboardingCompletedAt
			const { error: fetchError } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('onboarding_completed_at')
				.eq('id', user_id)
				.single()

			if (fetchError) {
				this.logger.error(
					'Failed to fetch existing user for onboarding status',
					{
						error: fetchError,
						user_id
					}
				)
				throw fetchError
			}

			// For now, just update the connected account ID
			// TODO: Handle onboarding status updates in property_owners table
			const { error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.update({
					connected_account_id: account.id
				})
				.eq('id', user_id)

			if (error) {
				this.logger.error('Failed to update onboarding status', {
					error,
					user_id
				})
				throw error
			}

			this.logger.log('Updated onboarding status', {
				user_id,
				accountId,
				onboardingComplete: account.charges_enabled && account.payouts_enabled
			})
		} catch (error) {
			this.logger.error('Failed to update onboarding status', {
				error,
				user_id,
				accountId
			})
			throw error
		}
	}
}
