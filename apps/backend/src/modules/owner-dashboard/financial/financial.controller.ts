import {
	Controller,
	Get,
	Query,
	Req,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { user_id } from '../../../shared/decorators/user.decorator'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { DashboardService } from '../../dashboard/dashboard.service'
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
@UseGuards(RolesGuard)
@Roles('OWNER')
@UseInterceptors(OwnerContextInterceptor)
@Controller('')
export class FinancialController {
	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	@Get('billing/insights')
	async getBillingInsights(
		@Req() req: AuthenticatedRequest,
		@user_id() user_id: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting billing insights', { user_id })

		const data = await this.dashboardService.getBillingInsights(user_id)

		return {
			success: true,
			data,
			message: 'Billing insights retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('billing/insights/available')
	async checkBillingInsightsAvailability(
		@Req() req: AuthenticatedRequest,
		@user_id() user_id: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Checking billing insights availability', { user_id })

		const available = await this.dashboardService.isBillingInsightsAvailable(
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

	@Get('billing/health')
	async getBillingHealth(
		@Req() req: AuthenticatedRequest,
		@user_id() user_id: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Checking billing health', { user_id })

		const isAvailable = await this.dashboardService.isBillingInsightsAvailable(
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

	@Get('revenue-trends')
	async getRevenueTrends(
		@Req() req: AuthenticatedRequest,
		@user_id() user_id: string,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		const monthsNum = parseInt(months, 10) || 12

		this.logger.log('Getting revenue trends', {
			user_id,
			months: monthsNum
		})

		const data = await this.dashboardService.getRevenueTrends(
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
