import {
	Controller,
	Get,
	Query,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Request } from 'express'
import { FinancialReportService } from './financial-report.service'
import { PropertyReportService } from './property-report.service'

interface AuthenticatedRequest extends Request {
	user?: { id: string; email: string }
}

/**
 * Report Analytics Controller
 *
 * Handles analytics data retrieval operations for dashboards and charts.
 * These endpoints return JSON data for visualization.
 */
@ApiTags('Reports')
@ApiBearerAuth('supabase-auth')
@Controller('reports')
export class ReportAnalyticsController {
	constructor(
		private readonly financialReportService: FinancialReportService,
		private readonly propertyReportService: PropertyReportService
	) {}

	/**
	 * GET /reports/analytics/revenue/monthly
	 * Get monthly revenue data for charts
	 */
	@ApiOperation({ summary: 'Get monthly revenue', description: 'Get monthly revenue data for charts' })
	@ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to retrieve (default: 12)' })
	@ApiResponse({ status: 200, description: 'Monthly revenue data retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/revenue/monthly')
	async getMonthlyRevenue(
		@Req() req: AuthenticatedRequest,
		@Query('months') months?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const parsedMonths = months ? parseInt(months, 10) : 12
		const data = await this.financialReportService.getMonthlyRevenue(
			user_id,
			parsedMonths
		)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/analytics/payments
	 * Get payment analytics for dashboard
	 */
	@ApiOperation({ summary: 'Get payment analytics', description: 'Get payment analytics data for dashboard' })
	@ApiQuery({ name: 'start_date', required: false, type: String, description: 'Start date filter (ISO format)' })
	@ApiQuery({ name: 'end_date', required: false, type: String, description: 'End date filter (ISO format)' })
	@ApiResponse({ status: 200, description: 'Payment analytics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/payments')
	async getPaymentAnalytics(
		@Req() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const data = await this.financialReportService.getPaymentAnalytics(
			user_id,
			start_date,
			end_date
		)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/analytics/occupancy
	 * Get occupancy metrics across all properties
	 */
	@ApiOperation({ summary: 'Get occupancy metrics', description: 'Get occupancy metrics across all properties' })
	@ApiResponse({ status: 200, description: 'Occupancy metrics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/occupancy')
	async getOccupancyMetrics(@Req() req: AuthenticatedRequest) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const data = await this.propertyReportService.getOccupancyMetrics(user_id)

		return {
			success: true,
			data
		}
	}
}
