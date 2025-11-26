import {
	Body,
	Controller,
	Post,
	Get,
	Request,
	BadRequestException,
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
	 * Helper method to fetch user data from Supabase
	 * @private
	 */
	private async getUserData<T>(user_id: string, fields: string): Promise<T> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('users')
			.select(fields)
			.eq('id', user_id)
			.single()

		if (error || !data) {
			throw new BadRequestException('User not found')
		}

		return data as T
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
			// Check if user already has a connected account
			const { data: user, error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('connected_account_id, email, first_name, last_name')
				.eq('id', user_id)
				.single()

			if (error || !user) {
				throw new BadRequestException('User not found')
			}

			// If already has connected account, create new account link
			if (user.connected_account_id) {
				const accountLink = await this.stripeConnectService.createAccountLink(
					user.connected_account_id
				)

				return {
					accountId: user.connected_account_id,
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
			const { data: user, error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('connected_account_id')
				.eq('id', user_id)
				.single()

			if (error || !user || !user.connected_account_id) {
				throw new BadRequestException('No connected account found')
			}

			const accountLink = await this.stripeConnectService.createAccountLink(
				user.connected_account_id
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
			const user = await this.getUserData<{
				connectedAccountId: string | null
				chargesEnabled: boolean | null
				detailsSubmitted: boolean | null
				payoutsEnabled: boolean | null
			}>(
				user_id,
				'connectedAccountId, chargesEnabled, detailsSubmitted, payoutsEnabled'
			)

			if (!user.connectedAccountId) {
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
					user.connectedAccountId
				)
			} catch (updateError) {
				this.logger.error('Failed to update onboarding status from Stripe', {
					user_id,
					connectedAccountId: user.connectedAccountId,
					error: updateError
				})
				// Set flag but continue with cached data instead of throwing
				staleSyncData = true
			}

			// Fetch updated status
			const updatedUser = await this.getUserData<{
				onboardingComplete: boolean | null
				detailsSubmitted: boolean | null
				chargesEnabled: boolean | null
				payoutsEnabled: boolean | null
				onboardingCompletedAt: string | null
			}>(
				user_id,
				'onboardingComplete, detailsSubmitted, chargesEnabled, payoutsEnabled, onboardingCompletedAt'
			)

			return {
				hasConnectedAccount: true,
				connectedAccountId: user.connectedAccountId,
				onboardingComplete: updatedUser.onboardingComplete || false,
				detailsSubmitted: updatedUser.detailsSubmitted || false,
				chargesEnabled: updatedUser.chargesEnabled || false,
				payoutsEnabled: updatedUser.payoutsEnabled || false,
				onboardingCompletedAt: updatedUser.onboardingCompletedAt,
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
			const user = await this.getUserData<{
				connectedAccountId: string | null
				onboardingComplete: boolean | null
			}>(user_id, 'connectedAccountId, onboardingComplete')

			if (!user.connectedAccountId) {
				throw new BadRequestException('No connected account found')
			}

			if (!user.onboardingComplete) {
				throw new BadRequestException('Complete onboarding first')
			}

			// Create Express Dashboard login link
			const url = await this.stripeConnectService.createDashboardLoginLink(
				user.connectedAccountId
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
		const userData = await this.getUserData<{ stripe_account_id: string | null }>(
			req.user.id,
			'stripe_account_id'
		)

		if (!userData.stripe_account_id) {
			throw new BadRequestException('No Stripe Connect account found. Please complete onboarding first.')
		}

		const balance = await this.stripeConnectService.getConnectedAccountBalance(
			userData.stripe_account_id
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
		const userData = await this.getUserData<{ stripe_account_id: string | null }>(
			req.user.id,
			'stripe_account_id'
		)

		if (!userData.stripe_account_id) {
			throw new BadRequestException('No Stripe Connect account found. Please complete onboarding first.')
		}

		const options: { limit?: number; starting_after?: string } = {
			limit: limit ? parseInt(limit, 10) : 10
		}
		if (startingAfter) {
			options.starting_after = startingAfter
		}

		const payouts = await this.stripeConnectService.listConnectedAccountPayouts(
			userData.stripe_account_id,
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
		const userData = await this.getUserData<{ stripe_account_id: string | null }>(
			req.user.id,
			'stripe_account_id'
		)

		if (!userData.stripe_account_id) {
			throw new BadRequestException('No Stripe Connect account found. Please complete onboarding first.')
		}

		const payout = await this.stripeConnectService.getPayoutDetails(
			userData.stripe_account_id,
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
		const userData = await this.getUserData<{ stripe_account_id: string | null }>(
			req.user.id,
			'stripe_account_id'
		)

		if (!userData.stripe_account_id) {
			throw new BadRequestException('No Stripe Connect account found. Please complete onboarding first.')
		}

		const options: { limit?: number; starting_after?: string } = {
			limit: limit ? parseInt(limit, 10) : 10
		}
		if (startingAfter) {
			options.starting_after = startingAfter
		}

		const transfers = await this.stripeConnectService.listTransfersToAccount(
			userData.stripe_account_id,
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
