import {
	Body,
	Controller,
	Post,
	Get,
	Request,
	BadRequestException,
	InternalServerErrorException,
	Logger,
	NotFoundException,
	Query,
	Param
} from '@nestjs/common'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import type { AuthenticatedRequest } from '@repo/shared/types/auth'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'


/**
 * Stripe-supported countries for Express accounts
 * Source: https://stripe.com/docs/connect/accounts
 */
const STRIPE_SUPPORTED_COUNTRIES = new Set([
	'US',
	'CA',
	'GB',
	'AU',
	'NZ',
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'NO',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE',
	'CH',
	'JP',
	'SG',
	'HK',
	'MX',
	'BR'
])

/**
 * Validates if a country code is supported by Stripe Connect
 */
function isValidStripeCountry(country: string | undefined): boolean {
	if (!country) return false
	const normalized = country.trim().toUpperCase()
	return STRIPE_SUPPORTED_COUNTRIES.has(normalized)
}

/** Default pagination limit */
const DEFAULT_PAGINATION_LIMIT = 10

/** Maximum allowed pagination limit */
const MAX_PAGINATION_LIMIT = 100

/**
 * Stripe Connect Controller
 *
 * Handles Connected Account management for multi-owner SaaS platform
 */
@Controller('stripe/connect')
export class StripeConnectController {
	private readonly logger = new Logger(StripeConnectController.name)

	constructor(
		private readonly stripeConnectService: StripeConnectService,
		private readonly supabaseService: SupabaseService,

	) {}

	/**
	 * Validates and normalizes pagination limit parameter
	 * @param limit - Optional string limit from query params
	 * @returns Normalized limit between 1 and MAX_PAGINATION_LIMIT
	 * @example
	 * validateLimit(undefined) // returns DEFAULT_PAGINATION_LIMIT (10)
	 * validateLimit('50')      // returns 50
	 * validateLimit('500')     // returns MAX_PAGINATION_LIMIT (100)
	 * validateLimit('abc')     // returns DEFAULT_PAGINATION_LIMIT (10)
	 * validateLimit('-5')      // returns DEFAULT_PAGINATION_LIMIT (10)
	 */
	private validateLimit(limit?: string): number {
		if (!limit) return DEFAULT_PAGINATION_LIMIT
		// Trim whitespace before validation
		const trimmed = limit.trim()
		if (!trimmed) return DEFAULT_PAGINATION_LIMIT
		// Validate format: only digits allowed (no negative signs, decimals, etc.)
		if (!/^\d+$/.test(trimmed)) return DEFAULT_PAGINATION_LIMIT
		const parsed = parseInt(trimmed, 10)
		// Clamp to valid range: at least 1, at most MAX_PAGINATION_LIMIT
		return Math.min(Math.max(parsed, 1), MAX_PAGINATION_LIMIT)
	}

	/**
	 * Retrieves the Stripe Connect account ID for the authenticated user
	 *
	 * This helper method looks up the property_owner record for the given user
	 * and returns their associated Stripe Connect account ID.
	 *
	 * @param userId - The authenticated user's ID (from auth.users)
	 * @returns The Stripe Connect account ID (e.g., "acct_...")
	 * @throws InternalServerErrorException if database query fails
	 * @throws BadRequestException if user has no Stripe Connect account
	 *
	 * @example
	 * const stripeAccountId = await this.getStripeAccountId(req.user.id)
	 * // Returns: "acct_1234567890"
	 */
	private async getStripeAccountId(userId: string): Promise<string> {
		const { data: propertyOwner, error } = await this.supabaseService
			.getAdminClient()
			.from('property_owners')
			.select('stripe_account_id')
			.eq('user_id', userId)
			.single()

		// Separate database errors (500) from missing account (400)
		if (error) {
			this.logger.error('Failed to fetch Stripe account', {
				error: error.message,
				code: error.code,
				userId
			})
			throw new InternalServerErrorException('Failed to retrieve payment account. Please try again or contact support if this persists.')
		}

		if (!propertyOwner?.stripe_account_id) {
			throw new BadRequestException('No Stripe Connect account found. Please complete onboarding first.')
		}

		return propertyOwner.stripe_account_id
	}

	/**
	 * Create a Stripe Connected Account and start onboarding
	 * POST /api/v1/stripe/connect/onboard
	 */
	@Post('onboard')
	@SkipSubscriptionCheck() // Allow onboarding before subscription is active
	async createConnectedAccount(
		@Request() req: AuthenticatedRequest,
		@Body() body?: { country?: string }
	) {
		const user_id = req.user.id
		const requestedCountry =
			body && typeof body.country === 'string' ? body.country : undefined

		// Validate country if provided
		if (requestedCountry && !isValidStripeCountry(requestedCountry)) {
			throw new BadRequestException(
				`Invalid country code: ${requestedCountry}. Must be a valid ISO 3166-1 alpha-2 country code supported by Stripe Connect (e.g., US, CA, GB).`
			)
		}

		try {
			// Get user info from users table
			const { data: user, error: userError } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('email, first_name, last_name')
				.eq('id', user_id)
				.single()

			if (userError || !user) {
				throw new BadRequestException('User not found')
			}

			// Check if user already has a property_owner record with stripe_account_id
			const { data: propertyOwner } = await this.supabaseService
				.getAdminClient()
				.from('property_owners')
				.select('stripe_account_id')
				.eq('user_id', user_id)
				.single()

			// If already has connected account, create new account link
			if (propertyOwner?.stripe_account_id) {
				const accountLink = await this.stripeConnectService.createAccountLink(
					propertyOwner.stripe_account_id
				)

				return {
					accountId: propertyOwner.stripe_account_id,
					onboardingUrl: accountLink.url,
					existing: true
				}
			}

			// Create new connected account
			const result = await this.stripeConnectService.createConnectedAccount({
				user_id,
				email: user.email,
				...(requestedCountry && { country: requestedCountry }),
				...(user.first_name && { first_name: user.first_name }),
				...(user.last_name && { last_name: user.last_name })
			})

			return {
				...result,
				existing: false
			}
		} catch (error) {
			this.logger.error('Failed to create connected account', {
				error,
				user_id
			})
			throw error
		}
	}

	/**
	 * Refresh Account Link (when expired or onboarding needs restart)
	 * POST /api/v1/stripe/connect/refresh-link
	 */
	@Post('refresh-link')
	@SkipSubscriptionCheck()
	async refreshAccountLink(@Request() req: AuthenticatedRequest) {
		const user_id = req.user.id

		try {
			const { data: propertyOwner, error } = await this.supabaseService
				.getAdminClient()
				.from('property_owners')
				.select('stripe_account_id')
				.eq('user_id', user_id)
				.single()

			if (error || !propertyOwner || !propertyOwner.stripe_account_id) {
				throw new BadRequestException('No connected account found')
			}

			const accountLink = await this.stripeConnectService.createAccountLink(
				propertyOwner.stripe_account_id
			)

			return {
				onboardingUrl: accountLink.url
			}
		} catch (error) {
			this.logger.error('Failed to refresh account link', {
				error,
				user_id
			})
			throw error
		}
	}

	/**
	 * Get Connected Account status
	 * GET /api/v1/stripe/connect/status
	 */
	@Get('status')
	@SkipSubscriptionCheck()
	async getConnectedAccountStatus(@Request() req: AuthenticatedRequest) {
		const user_id = req.user.id

		try {
			// Get property owner record with Stripe Connect info
			const { data: propertyOwner, error } = await this.supabaseService
				.getAdminClient()
				.from('property_owners')
				.select('stripe_account_id, charges_enabled, payouts_enabled, onboarding_status, onboarding_completed_at')
				.eq('user_id', user_id)
				.single()

			if (error || !propertyOwner || !propertyOwner.stripe_account_id) {
				return {
					hasConnectedAccount: false,
					onboardingComplete: false
				}
			}

			// Update status from Stripe (in case it changed)
			let staleSyncData = false
			try {
				await this.stripeConnectService.updateOnboardingStatus(
					user_id,
					propertyOwner.stripe_account_id
				)
			} catch (updateError) {
				this.logger.error('Failed to update onboarding status from Stripe', {
					user_id,
					stripe_account_id: propertyOwner.stripe_account_id,
					error: updateError
				})
				// Set flag but continue with cached data instead of throwing
				staleSyncData = true
			}

			// Fetch updated status from property_owners
			const { data: updatedOwner } = await this.supabaseService
				.getAdminClient()
				.from('property_owners')
				.select('charges_enabled, payouts_enabled, onboarding_status, onboarding_completed_at')
				.eq('user_id', user_id)
				.single()

			const isOnboardingComplete = updatedOwner?.onboarding_status === 'complete'

			return {
				hasConnectedAccount: true,
				connectedAccountId: propertyOwner.stripe_account_id,
				onboardingComplete: isOnboardingComplete,
				chargesEnabled: updatedOwner?.charges_enabled || false,
				payoutsEnabled: updatedOwner?.payouts_enabled || false,
				onboardingCompletedAt: updatedOwner?.onboarding_completed_at,
				staleSyncData
			}
		} catch (error) {
			this.logger.error('Failed to get connected account status', {
				error,
				user_id
			})
			throw error
		}
	}

	@Get('account')
	async getConnectedAccountDetails(@Request() req: AuthenticatedRequest) {
		const user_id = req.user.id

		const account = await this.stripeConnectService.getConnectedAccount(user_id)

		if (!account) {
			throw new NotFoundException('No connected account found')
		}

		// Identity verification removed - service deleted in refactoring
		const identityVerification = null

		return {
			success: true,
			data: {
				...account,
				identityVerification
			}
		}
	}

	/**
	 * Get Stripe Dashboard login link for the connected account
	 * POST /api/v1/stripe/connect/dashboard-link
	 */
	@Post('dashboard-link')
	async getStripeDashboardLink(@Request() req: AuthenticatedRequest) {
		const user_id = req.user.id

		try {
			const { data: propertyOwner, error } = await this.supabaseService
				.getAdminClient()
				.from('property_owners')
				.select('stripe_account_id, onboarding_status')
				.eq('user_id', user_id)
				.single()

			if (error || !propertyOwner?.stripe_account_id) {
				throw new BadRequestException('No connected account found')
			}

			if (propertyOwner.onboarding_status !== 'complete') {
				throw new BadRequestException('Complete onboarding first')
			}

			// Create Express Dashboard login link
			const url = await this.stripeConnectService.createDashboardLoginLink(
				propertyOwner.stripe_account_id
			)

			return { url }
		} catch (error) {
			this.logger.error('Failed to create dashboard link', {
				error,
				user_id
			})
			throw error
		}
	}


	/**
	 * Get connected account balance
	 * GET /api/v1/stripe/connect/balance
	 */
	@Get('balance')
	async getConnectedAccountBalance(@Request() req: AuthenticatedRequest) {
		const stripeAccountId = await this.getStripeAccountId(req.user.id)

		const balance = await this.stripeConnectService.getConnectedAccountBalance(
			stripeAccountId
		)

		return {
			success: true,
			balance: {
				available: balance.available.map(b => ({
					amount: b.amount,
					currency: b.currency
				})),
				pending: balance.pending.map(b => ({
					amount: b.amount,
					currency: b.currency
				}))
			}
		}
	}

	/**
	 * List payouts for connected account
	 * GET /api/v1/stripe/connect/payouts
	 */
	@Get('payouts')
	async listPayouts(
		@Request() req: AuthenticatedRequest,
		@Query('limit') limit?: string,
		@Query('starting_after') startingAfter?: string
	) {
		const stripeAccountId = await this.getStripeAccountId(req.user.id)

		const parsedLimit = this.validateLimit(limit)
		const options: { limit?: number; starting_after?: string } = {
			limit: parsedLimit
		}
		if (startingAfter) {
			options.starting_after = startingAfter
		}

		const payouts = await this.stripeConnectService.listConnectedAccountPayouts(
			stripeAccountId,
			options
		)

		return {
			success: true,
			payouts: payouts.data.map(payout => ({
				id: payout.id,
				amount: payout.amount,
				currency: payout.currency,
				status: payout.status,
				arrival_date: payout.arrival_date,
				created: payout.created,
				method: payout.method,
				type: payout.type
			})),
			hasMore: payouts.has_more
		}
	}

	/**
	 * Get specific payout details
	 * GET /api/v1/stripe/connect/payouts/:payoutId
	 */
	@Get('payouts/:payoutId')
	async getPayoutDetails(
		@Request() req: AuthenticatedRequest,
		@Param('payoutId') payoutId: string
	) {
		const stripeAccountId = await this.getStripeAccountId(req.user.id)

		const payout = await this.stripeConnectService.getPayoutDetails(
			stripeAccountId,
			payoutId
		)

		return {
			success: true,
			payout: {
				id: payout.id,
				amount: payout.amount,
				currency: payout.currency,
				status: payout.status,
				arrival_date: payout.arrival_date,
				created: payout.created,
				method: payout.method,
				type: payout.type,
				description: payout.description,
				failure_message: payout.failure_message
			}
		}
	}

	/**
	 * List rent payments received (transfers to connected account)
	 * GET /api/v1/stripe/connect/transfers
	 */
	@Get('transfers')
	async listTransfers(
		@Request() req: AuthenticatedRequest,
		@Query('limit') limit?: string,
		@Query('starting_after') startingAfter?: string
	) {
		const stripeAccountId = await this.getStripeAccountId(req.user.id)

		const parsedLimit = this.validateLimit(limit)
		const options: { limit?: number; starting_after?: string } = {
			limit: parsedLimit
		}
		if (startingAfter) {
			options.starting_after = startingAfter
		}

		const transfers = await this.stripeConnectService.listTransfersToAccount(
			stripeAccountId,
			options
		)

		return {
			success: true,
			transfers: transfers.data.map(transfer => ({
				id: transfer.id,
				amount: transfer.amount,
				currency: transfer.currency,
				created: transfer.created,
				description: transfer.description,
				metadata: transfer.metadata
			})),
			hasMore: transfers.has_more
		}
	}
}
