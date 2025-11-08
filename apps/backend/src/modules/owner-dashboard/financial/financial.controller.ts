import {
	Controller,
	Get,
	Query,
	Req,
	UnauthorizedException,
	Logger,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { UserId } from '../../../shared/decorators/user.decorator'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { DashboardService } from '../../dashboard/dashboard.service'
import { OwnerAuthGuard } from '../guards/owner-auth.guard'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'

/**
 * FinancialController
 *
 * Handles owner financial analytics:
 * - Billing insights (Stripe Sync Engine)
 * - Revenue trends
 * - Financial health checks
 */
@UseGuards(OwnerAuthGuard)
@UseInterceptors(OwnerContextInterceptor)
@Controller('financial')
export class FinancialController {
	private readonly logger = new Logger(FinancialController.name)

	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService
	) {}

	@Get('billing/insights')
	async getBillingInsights(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting billing insights', {
			userId,
			dateRange: { startDate, endDate }
		})

		const parsedStartDate = startDate ? new Date(startDate) : undefined
		const parsedEndDate = endDate ? new Date(endDate) : undefined

		if (
			(parsedStartDate && isNaN(parsedStartDate.getTime())) ||
			(parsedEndDate && isNaN(parsedEndDate.getTime()))
		) {
			return {
				success: false,
				data: null,
				message: 'Invalid date format. Use ISO date strings.',
				timestamp: new Date()
			}
		}

		const data = await this.dashboardService.getBillingInsights(
			userId,
			token,
			parsedStartDate,
			parsedEndDate
		)

		return {
			success: true,
			data,
			message:
				'Billing insights retrieved successfully from Stripe Sync Engine',
			timestamp: new Date()
		}
	}

	@Get('billing/insights/available')
	async checkBillingInsightsAvailability(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Checking billing insights availability', { userId })

		const available = await this.dashboardService.isBillingInsightsAvailable(
			userId,
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
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Checking billing health', { userId })

		const isAvailable = await this.dashboardService.isBillingInsightsAvailable(
			userId,
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
		@UserId() userId: string,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		const monthsNum = parseInt(months, 10) || 12

		this.logger.log('Getting revenue trends', {
			userId,
			months: monthsNum
		})

		const data = await this.dashboardService.getRevenueTrends(
			userId,
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
