import {
	Controller,
	Get,
	Query,
	Request,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { ReportsService } from './reports.service'
import type { MetricTrend, TimeSeriesDataPoint } from '@repo/shared/types/analytics'
import { RolesGuard } from '../../../shared/guards/roles.guard'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'
import {
	TimeSeriesQueryDto,
	MetricTrendQueryDto
} from './dto/reports-query.dto'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * ReportsController
 *
 * Handles owner dashboard reporting endpoints:
 * - Metric trends (current vs previous period comparison)
 * - Time series data for charts
 */
@ApiTags('Owner Dashboard - Reports')
@ApiBearerAuth('supabase-auth')
@UseGuards(RolesGuard)
@Roles('OWNER')
@UseInterceptors(OwnerContextInterceptor)
@Controller('')
export class ReportsController {
	constructor(
		private readonly reportsService: ReportsService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get time series data for a metric
	 * @param metric - The metric to retrieve (occupancy_rate, monthly_revenue, etc.)
	 * @param days - Number of days of data (default 30)
	 */
	@ApiOperation({ summary: 'Get time series data', description: 'Retrieve time series data for a specific metric' })
	@ApiResponse({ status: 200, description: 'Time series data retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('time-series')
	async getTimeSeries(
		@Request() req: AuthenticatedRequest,
		@Query() query: TimeSeriesQueryDto
	): Promise<TimeSeriesDataPoint[]> {
		const userId = req.user.id
		const { metric, days } = query

		this.logger.log('Getting time series data', { userId, metric, days })

		return this.reportsService.getTimeSeries(userId, metric, days)
	}

	/**
	 * Get trend data for a metric (current vs previous period)
	 * @param metric - The metric to retrieve
	 * @param period - The period to compare (day, week, month, year)
	 */
	@ApiOperation({ summary: 'Get metric trend', description: 'Retrieve trend data comparing current vs previous period' })
	@ApiResponse({ status: 200, description: 'Metric trend retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('metric-trend')
	async getMetricTrend(
		@Request() req: AuthenticatedRequest,
		@Query() query: MetricTrendQueryDto
	): Promise<MetricTrend> {
		const userId = req.user.id
		const { metric, period } = query

		this.logger.log('Getting metric trend', {
			userId,
			metric,
			period
		})

		return this.reportsService.getMetricTrend(userId, metric, period)
	}
}
