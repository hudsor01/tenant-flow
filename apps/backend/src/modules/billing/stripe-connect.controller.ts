import {
	Body,
	Controller,
	Post,
	Get,
	UseGuards,
	Request,
	BadRequestException,
	InternalServerErrorException,
	Logger
} from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import type { AuthenticatedRequest } from '@repo/shared/types/auth'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Stripe Connect Controller
 *
 * Handles Connected Account management for multi-owner SaaS platform
 */
@Controller('stripe/connect')
@UseGuards(JwtAuthGuard)
export class StripeConnectController {
	private readonly logger = new Logger(StripeConnectController.name)

	constructor(
		private readonly stripeConnectService: StripeConnectService,
		private readonly supabaseService: SupabaseService
	) {}

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
		const userId = req.user.id
		const requestedCountry =
			body && typeof body.country === 'string' ? body.country : undefined

		try {
			// Check if user already has a connected account
			const { data: user, error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('connectedAccountId, email, firstName, lastName')
				.eq('id', userId)
				.single()

			if (error || !user) {
				throw new BadRequestException('User not found')
			}

			// If already has connected account, create new account link
			if (user.connectedAccountId) {
				const accountLink = await this.stripeConnectService.createAccountLink(
					user.connectedAccountId
				)

				return {
					accountId: user.connectedAccountId,
					onboardingUrl: accountLink.url,
					existing: true
				}
			}

			// Create new connected account
			const result = await this.stripeConnectService.createConnectedAccount({
				userId,
				email: user.email,
				...(requestedCountry && { country: requestedCountry }),
				...(user.firstName && { firstName: user.firstName }),
				...(user.lastName && { lastName: user.lastName })
			})

			return {
				...result,
				existing: false
			}
		} catch (error) {
			this.logger.error('Failed to create connected account', {
				error,
				userId
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
		const userId = req.user.id

		try {
			const { data: user, error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('connectedAccountId')
				.eq('id', userId)
				.single()

			if (error || !user || !user.connectedAccountId) {
				throw new BadRequestException('No connected account found')
			}

			const accountLink = await this.stripeConnectService.createAccountLink(
				user.connectedAccountId
			)

			return {
				onboardingUrl: accountLink.url
			}
		} catch (error) {
			this.logger.error('Failed to refresh account link', {
				error,
				userId
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
		const userId = req.user.id

		try {
			const { data: user, error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select(
					'connectedAccountId, chargesEnabled, detailsSubmitted, payoutsEnabled'
				)
				.eq('id', userId)
				.single()

			if (error || !user) {
				throw new BadRequestException('User not found')
			}

			if (!user.connectedAccountId) {
				return {
					hasConnectedAccount: false,
					onboardingComplete: false
				}
			}

			// Update status from Stripe (in case it changed)
			try {
				await this.stripeConnectService.updateOnboardingStatus(
					userId,
					user.connectedAccountId
				)
			} catch (updateError) {
				this.logger.error('Failed to update onboarding status from Stripe', {
					userId,
					connectedAccountId: user.connectedAccountId,
					error: updateError
				})
				throw new InternalServerErrorException(
					'Failed to sync onboarding status with Stripe'
				)
			}

			// Fetch updated status
			const { data: updatedUser, error: fetchError } =
				await this.supabaseService
					.getAdminClient()
					.from('users')
					.select(
						'onboardingComplete, detailsSubmitted, chargesEnabled, payoutsEnabled, onboardingCompletedAt'
					)
					.eq('id', userId)
					.single()

			if (fetchError || !updatedUser) {
				this.logger.error('Failed to fetch updated user status', {
					userId,
					error: fetchError
				})
				throw new InternalServerErrorException(
					'Failed to retrieve updated onboarding status'
				)
			}

			return {
				hasConnectedAccount: true,
				connectedAccountId: user.connectedAccountId,
				onboardingComplete: updatedUser.onboardingComplete || false,
				detailsSubmitted: updatedUser.detailsSubmitted || false,
				chargesEnabled: updatedUser.chargesEnabled || false,
				payoutsEnabled: updatedUser.payoutsEnabled || false,
				onboardingCompletedAt: updatedUser.onboardingCompletedAt
			}
		} catch (error) {
			this.logger.error('Failed to get connected account status', {
				error,
				userId
			})
			throw error
		}
	}

	/**
	 * Get Stripe Dashboard login link for the connected account
	 * POST /api/v1/stripe/connect/dashboard-link
	 */
	@Post('dashboard-link')
	async getStripeDashboardLink(@Request() req: AuthenticatedRequest) {
		const userId = req.user.id

		try {
			const { data: user, error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('connectedAccountId, onboardingComplete')
				.eq('id', userId)
				.single()

			if (error || !user || !user.connectedAccountId) {
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
				userId
			})
			throw error
		}
	}
}
