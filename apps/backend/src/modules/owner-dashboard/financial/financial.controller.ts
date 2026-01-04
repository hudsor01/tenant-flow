import {
	Controller,
	Get,
	Query,
	Req,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'

import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { DashboardTrendsService } from '../../dashboard/dashboard-trends.service'
import { RolesGuard } from '../../../shared/guards/roles.guard'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * FinancialController
 *
 * Handles owner financial analytics:
 * - Billing insights (Stripe Sync Engine)
 * - Revenue trends
 * - Financial health checks
 */
@ApiTags('Owner Dashboard - Financial')
@ApiBearerAuth('supabase-auth')
@UseGuards(RolesGuard)
@Roles('OWNER')
@UseInterceptors(OwnerContextInterceptor)
@Controller('')
export class FinancialController {
	constructor(
		private readonly dashboardTrendsService: DashboardTrendsService,
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	@ApiOperation({ summary: 'Get billing insights', description: 'Retrieve billing insights from Stripe Sync Engine' })
	@ApiResponse({ status: 200, description: 'Billing insights retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('billing/insights')
	async getBillingInsights(
		@Req() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = req.user.id
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting billing insights', { user_id })

		const data = await this.dashboardTrendsService.getBillingInsights(user_id)

		return {
			success: true,
			data,
			message: 'Billing insights retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Check billing insights availability', description: 'Check if billing insights are available for the user' })
	@ApiResponse({ status: 200, description: 'Availability status retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('billing/insights/available')
	async checkBillingInsightsAvailability(
		@Req() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = req.user.id
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Checking billing insights availability', { user_id })

		const available =
			await this.dashboardTrendsService.isBillingInsightsAvailable(
			user_id,
			token
		)

		return {
			success: true,
			data: { available },
			message: available
				? 'Billing insights are available'
				: 'Billing insights are not available',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get billing health', description: 'Check billing system health and available capabilities' })
	@ApiResponse({ status: 200, description: 'Billing health status retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('billing/health')
	async getBillingHealth(
		@Req() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = req.user.id
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Checking billing health', { user_id })

		const isAvailable =
			await this.dashboardTrendsService.isBillingInsightsAvailable(
			user_id,
			token
		)

		return {
			success: true,
			data: {
				available: isAvailable,
				service: 'Stripe Sync Engine',
				capabilities: isAvailable
					? [
							'Revenue Analytics',
							'Churn Analysis',
							'Customer Lifetime Value',
							'MRR Tracking',
							'Subscription Status Breakdown'
						]
					: []
			},
			message: isAvailable
				? 'Billing insights are available'
				: 'Billing insights not available - Stripe Sync Engine not configured',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get revenue trends', description: 'Retrieve revenue trends over specified months' })
	@ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default: 12)' })
	@ApiResponse({ status: 200, description: 'Revenue trends retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('revenue-trends')
	async getRevenueTrends(
		@Req() req: AuthenticatedRequest,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const user_id = req.user.id
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		const monthsNum = parseInt(months, 10) || 12

		this.logger.log('Getting revenue trends', {
			user_id,
			months: monthsNum
		})

		const data = await this.dashboardTrendsService.getRevenueTrends(
			user_id,
			token,
			monthsNum
		)

		return {
			success: true,
			data,
			message: 'Revenue trends retrieved successfully',
			timestamp: new Date()
		}
	}
}
