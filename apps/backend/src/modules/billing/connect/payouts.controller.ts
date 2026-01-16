import {
	Controller,
	Get,
	Request,
	BadRequestException,
	InternalServerErrorException,
	UnauthorizedException,
	Query,
	Param
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { ConnectService } from './connect.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { validateLimit } from '../../../shared/utils/pagination.utils'

/**
 * Stripe Connect Payouts Controller
 *
 * Handles payout and transfer operations for Connected Accounts
 */
@ApiTags('Stripe Connect')
@ApiBearerAuth('supabase-auth')
@Controller('stripe/connect')
export class PayoutsController {
	constructor(
		private readonly connectService: ConnectService,
		private readonly supabaseService: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Retrieves the Stripe Connect account ID for the authenticated user
	 */
	private async getStripeAccountId(
		userId: string,
		token: string
	): Promise<string> {
		const { data: propertyOwner, error } = await this.supabaseService
			.getUserClient(token)
			.from('stripe_connected_accounts')
			.select('stripe_account_id')
			.eq('user_id', userId)
			.single()

		if (error) {
			this.logger.error('Failed to fetch Stripe account', {
				error: error.message,
				code: error.code,
				userId
			})
			throw new InternalServerErrorException(
				'Failed to retrieve payment account. Please try again or contact support if this persists.'
			)
		}

		if (!propertyOwner?.stripe_account_id) {
			throw new BadRequestException(
				'No Stripe Connect account found. Please complete onboarding first.'
			)
		}

		return propertyOwner.stripe_account_id
	}

	/**
	 * List payouts for connected account
	 * GET /api/v1/stripe/connect/payouts
	 */
	@ApiOperation({
		summary: 'List payouts',
		description: 'List payouts for the Connected Account with pagination'
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of payouts to return (default: 10, max: 100)'
	})
	@ApiQuery({
		name: 'starting_after',
		required: false,
		type: String,
		description: 'Cursor for pagination'
	})
	@ApiResponse({ status: 200, description: 'Payouts retrieved' })
	@ApiResponse({ status: 400, description: 'No connected account found' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('payouts')
	async listPayouts(
		@Request() req: AuthenticatedRequest,
		@Query('limit') limit?: string,
		@Query('starting_after') startingAfter?: string
	) {
		const token = this.supabaseService.getTokenFromRequest(req)
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const stripeAccountId = await this.getStripeAccountId(req.user.id, token)

		const parsedLimit = validateLimit(limit)
		const options: { limit?: number; starting_after?: string } = {
			limit: parsedLimit
		}
		if (startingAfter) {
			options.starting_after = startingAfter
		}

		const payouts = await this.connectService.listConnectedAccountPayouts(
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
	@ApiOperation({
		summary: 'Get payout details',
		description: 'Get details for a specific payout'
	})
	@ApiParam({ name: 'payoutId', type: String, description: 'Stripe payout ID' })
	@ApiResponse({ status: 200, description: 'Payout details retrieved' })
	@ApiResponse({ status: 400, description: 'No connected account found' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('payouts/:payoutId')
	async getPayoutDetails(
		@Request() req: AuthenticatedRequest,
		@Param('payoutId') payoutId: string
	) {
		const token = this.supabaseService.getTokenFromRequest(req)
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const stripeAccountId = await this.getStripeAccountId(req.user.id, token)

		const payout = await this.connectService.getPayoutDetails(
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
	@ApiOperation({
		summary: 'List transfers',
		description:
			'List rent payment transfers received by the Connected Account'
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of transfers to return (default: 10, max: 100)'
	})
	@ApiQuery({
		name: 'starting_after',
		required: false,
		type: String,
		description: 'Cursor for pagination'
	})
	@ApiResponse({ status: 200, description: 'Transfers retrieved' })
	@ApiResponse({ status: 400, description: 'No connected account found' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('transfers')
	async listTransfers(
		@Request() req: AuthenticatedRequest,
		@Query('limit') limit?: string,
		@Query('starting_after') startingAfter?: string
	) {
		const token = this.supabaseService.getTokenFromRequest(req)
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const stripeAccountId = await this.getStripeAccountId(req.user.id, token)

		const parsedLimit = validateLimit(limit)
		const options: { limit?: number; starting_after?: string } = {
			limit: parsedLimit
		}
		if (startingAfter) {
			options.starting_after = startingAfter
		}

		const transfers = await this.connectService.listTransfersToAccount(
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
