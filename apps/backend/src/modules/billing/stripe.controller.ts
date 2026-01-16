import {
	Controller,
	Get,
	Request,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { StripeService } from './stripe.service'
import { StripeSharedService } from './stripe-shared.service'
import { AppLogger } from '../../logger/app-logger.service'
import { STRIPE_API_THROTTLE } from './stripe.controller.shared'
import type Stripe from 'stripe'

/**
 * Stripe Controller
 *
 * Provides core Stripe account operations:
 * - GET /stripe/account - Platform account info
 * - GET /stripe/account/balance - Platform account balance
 *
 * For specialized operations, use:
 * - ChargesController - Charges and refunds
 * - CheckoutController - Checkout sessions
 * - InvoicesController - Invoice operations
 * - /stripe/connect - Connected account management
 * - /stripe/tenant - Tenant payment operations
 * - /stripe/subscriptions - Subscription management
 */
@ApiTags('Stripe')
@ApiBearerAuth('supabase-auth')
@Controller('stripe')
@Throttle({ default: STRIPE_API_THROTTLE })
export class StripeController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly stripeSharedService: StripeSharedService,
		private readonly logger: AppLogger
	) {}

	// ============================================
	// Account & Balance Operations
	// ============================================

	@ApiOperation({
		summary: 'Get platform account info',
		description: 'Retrieve Stripe account information for the platform'
	})
	@ApiResponse({ status: 200, description: 'Account info retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 500, description: 'Failed to retrieve account info' })
	@Get('account')
	async getAccount(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const account = await stripe.accounts.retrieve()
			return {
				id: account.id,
				business_profile: account.business_profile,
				capabilities: account.capabilities,
				charges_enabled: account.charges_enabled,
				payouts_enabled: account.payouts_enabled,
				country: account.country,
				default_currency: account.default_currency
			}
		} catch (error) {
			this.logger.error('Failed to get Stripe account', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	@ApiOperation({
		summary: 'Get platform account balance',
		description: 'Retrieve current balance for the platform Stripe account'
	})
	@ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 500, description: 'Failed to retrieve balance' })
	@Get('account/balance')
	async getAccountBalance(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const balance = await stripe.balance.retrieve()
			return balance
		} catch (error) {
			this.logger.error('Failed to get Stripe balance', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}
}
