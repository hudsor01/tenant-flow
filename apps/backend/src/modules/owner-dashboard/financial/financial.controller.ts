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
import { user_id } from '../../../shared/decorators/user.decorator'
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
		@user_id() user_id: string,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting billing insights', {
			user_id,
			dateRange: { start_date, end_date }
		})

		const parsedstart_date = start_date ? new Date(start_date) : undefined
		const parsedEndDate = end_date ? new Date(end_date) : undefined

		if (
			(parsedstart_date && isNaN(parsedstart_date.getTime())) ||
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
			user_id,
			token,
			parsedstart_date,
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
