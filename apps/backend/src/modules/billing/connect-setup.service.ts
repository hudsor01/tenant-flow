import { Injectable, BadRequestException } from '@nestjs/common'
import type Stripe from 'stripe'
import * as countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import { StripeClientService } from '../../shared/stripe-client.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppConfigService } from '../../config/app-config.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Stripe Connect Setup Service
 *
 * Handles Connected Account creation and onboarding
 * - Creates Express Connected Accounts for property owners
 * - Manages onboarding with Account Links
 * - Tracks onboarding status
 */
@Injectable()
export class ConnectSetupService {
	private stripe: Stripe
	private readonly defaultCountry: string

	// Stripe-supported 2-letter country codes
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

	constructor(private readonly stripeClientService: StripeClientService,
		private readonly supabaseService: SupabaseService,
		private readonly appConfigService: AppConfigService, private readonly logger: AppLogger) {
		countries.registerLocale(enLocale)
		this.stripe = this.stripeClientService.getClient()
		this.defaultCountry =
			this.normalizeCountryCode(this.appConfigService.getStripeConnectDefaultCountry()) ?? 'US'
	}

	/** Get the Stripe instance for direct API access */
	getStripe(): Stripe {
		return this.stripe
	}

	/** Create a Stripe Connected Account for a property owner */
	async createConnectedAccount(params: {
		user_id: string
		email: string
		first_name?: string
		last_name?: string
		country?: string
	}): Promise<{ accountId: string; onboardingUrl: string }> {
		// Check if user already has a connected account (idempotent)
		const { data: existingOwner, error: fetchError } = await this.supabaseService
			.getAdminClient()
			.from('stripe_connected_accounts')
			.select('stripe_account_id')
			.eq('user_id', params.user_id)
			.single()

		if (fetchError && fetchError.code !== 'PGRST116') {
			this.logger.error('Failed to fetch property owner', { error: fetchError, user_id: params.user_id })
			throw new BadRequestException('Failed to fetch property owner')
		}

		if (existingOwner?.stripe_account_id) {
			this.logger.log('User already has connected account', {
				user_id: params.user_id,
				accountId: existingOwner.stripe_account_id
			})
			const accountLink = await this.createAccountLink(existingOwner.stripe_account_id)
			return { accountId: existingOwner.stripe_account_id, onboardingUrl: accountLink.url }
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
			}

			const account = await this.stripe.accounts.create(
				{
					type: 'express',
					country: accountCountry,
					email: params.email,
					capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
					tos_acceptance: { service_agreement: 'full' },
					business_type: 'individual',
					settings: { payouts: { schedule: { interval: 'monthly', monthly_anchor: 1 } } },
					metadata: { user_id: params.user_id, platform: 'tenantflow', country: accountCountry }
				},
				{ idempotencyKey: `create_account_${params.user_id}` }
			)

			stripeAccountId = account.id
			this.logger.log('Created Connected Account', { user_id: params.user_id, accountId: account.id })

			const { error: updateError } = await this.supabaseService
				.getAdminClient()
				.from('stripe_connected_accounts')
				.update({ stripe_account_id: account.id, onboarding_status: 'pending' })
				.eq('user_id', params.user_id)

			if (updateError) {
				this.logger.error('Failed to save stripe_account_id', {
					error: updateError,
					user_id: params.user_id,
					accountId: account.id
				})
				await this.cleanupStripeAccount(account.id, 'after database update failure')
				throw new BadRequestException('Failed to save account')
			}

			const accountLink = await this.createAccountLink(account.id)
			return { accountId: account.id, onboardingUrl: accountLink.url }
		} catch (error) {
			this.logger.error('Failed to create Connected Account', {
				error,
				user_id: params.user_id,
				stripeAccountId
			})
			if (stripeAccountId) {
				await this.cleanupStripeAccount(stripeAccountId, 'after error')
			}
			throw error
		}
	}

	/** Create an Account Link for onboarding */
	async createAccountLink(accountId: string): Promise<Stripe.AccountLink> {
		const frontendUrl = this.appConfigService.getFrontendUrl()

		try {
			const url = new URL(frontendUrl)
			if (url.protocol !== 'http:' && url.protocol !== 'https:') {
				throw new Error(`FRONTEND_URL must use http or https protocol, got: ${url.protocol}`)
			}
		} catch (urlError: unknown) {
			this.logger.error(`Invalid FRONTEND_URL format: ${frontendUrl}`, { accountId, urlError })
			const errorMessage = urlError instanceof Error ? urlError.message : String(urlError)
			throw new Error(
				`Invalid FRONTEND_URL format: ${frontendUrl} - ${errorMessage}`,
				{ cause: urlError }
			)
		}

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

	/** Get Connected Account details */
	async getConnectedAccount(accountId: string): Promise<Stripe.Account> {
		try {
			return await this.stripe.accounts.retrieve(accountId)
		} catch (error) {
			this.logger.error('Failed to retrieve Connected Account', { error, accountId })
			throw error
		}
	}

	/** Update property owner onboarding status based on Stripe Account */
	async updateOnboardingStatus(user_id: string, accountId: string): Promise<void> {
		try {
			const account = await this.getConnectedAccount(accountId)

			const { data: existingOwner, error: fetchError } = await this.supabaseService
				.getAdminClient()
				.from('stripe_connected_accounts')
				.select('onboarding_completed_at')
				.eq('user_id', user_id)
				.single()

			if (fetchError) {
				this.logger.error('Failed to fetch property owner for onboarding status', {
					error: fetchError,
					user_id
				})
				throw fetchError
			}

			const onboardingComplete = account.charges_enabled && account.payouts_enabled
			const onboardingCompletedAt =
				onboardingComplete && existingOwner?.onboarding_completed_at
					? existingOwner.onboarding_completed_at
					: onboardingComplete
						? new Date().toISOString()
						: undefined

			const propertyOwnerUpdate: Record<string, unknown> = {
				stripe_account_id: account.id,
				charges_enabled: account.charges_enabled,
				payouts_enabled: account.payouts_enabled,
				onboarding_status: onboardingComplete ? 'complete' : 'in_progress',
				requirements_due: account.requirements?.currently_due ?? null
			}

			if (onboardingCompletedAt) {
				propertyOwnerUpdate.onboarding_completed_at = onboardingCompletedAt
			}

			const { error: ownerError } = await this.supabaseService
				.getAdminClient()
				.from('stripe_connected_accounts')
				.update(propertyOwnerUpdate)
				.eq('user_id', user_id)

			if (ownerError) {
				this.logger.error('Failed to update property owner onboarding', {
					error: ownerError,
					user_id,
					accountId
				})
				throw ownerError
			}

			this.logger.log('Updated onboarding status', {
				user_id,
				accountId,
				onboardingComplete: account.charges_enabled && account.payouts_enabled
			})
		} catch (error) {
			this.logger.error('Failed to update onboarding status', { error, user_id, accountId })
			throw error
		}
	}

	private normalizeCountryCode(country?: string | null): string | null {
		if (!country) return null
		const trimmed = country.trim()
		if (!trimmed) return null
		const code = trimmed.toUpperCase()
		if (!/^[A-Z]{2}$/.test(code)) return null
		if (!this.stripeSupportedCountries.has(code)) {
			this.logger.warn('Unsupported country code for Stripe Connect', {
				country: code,
				message: 'Stripe does not support this country for Express accounts'
			})
			return null
		}
		return code
	}

	private async cleanupStripeAccount(accountId: string, context: string): Promise<void> {
		try {
			await this.stripe.accounts.del(accountId)
			this.logger.log(`Cleaned up orphaned Stripe account ${context}`, { accountId, context })
		} catch (deleteError) {
			this.logger.error(`Failed to cleanup Stripe account ${context}`, {
				error: deleteError,
				accountId,
				context
			})
		}
	}
}