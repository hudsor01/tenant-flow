import {
	Controller,
	Get,
	Query,
	Req,
	UnauthorizedException,
	Logger,
	BadRequestException,
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
 * ReportsController
 *
 * Handles owner reports and analytics:
 * - Time-series data
 * - Metric trends
 */
@UseGuards(OwnerAuthGuard)
@UseInterceptors(OwnerContextInterceptor)
@Controller('reports')
export class ReportsController {
	private readonly logger = new Logger(ReportsController.name)

	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService
	) {}

	@Get('time-series')
	async getTimeSeries(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string,
		@Query('metric') metric: string,
		@Query('days') days?: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		if (!metric) {
			throw new BadRequestException('metric parameter is required')
		}

		const parsedDays = days ? parseInt(days, 10) : 30

		this.logger.log('Getting time-series data', {
			userId,
			metric,
			days: parsedDays
		})

		const data = await this.dashboardService.getTimeSeries(
			userId,
			metric,
			parsedDays,
			token
		)

		return {
			success: true,
			data,
			message: 'Time-series data retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('metric-trend')
	async getMetricTrend(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string,
		@Query('metric') metric: string,
		@Query('period') period?: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		if (!metric) {
			throw new BadRequestException('metric parameter is required')
		}

		const validPeriod = period || 'month'

		this.logger.log('Getting metric trend', {
			userId,
			metric,
			period: validPeriod
		})

		const data = await this.dashboardService.getMetricTrend(
			userId,
			metric,
			validPeriod,
			token
		)

		return {
			success: true,
			data,
			message: 'Metric trend retrieved successfully',
			timestamp: new Date()
		}
	}
}
