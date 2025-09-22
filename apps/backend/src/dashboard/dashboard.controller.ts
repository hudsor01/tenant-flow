import {
	Controller,
	Get,
	Logger,
	NotFoundException,
	Optional,
	Query
} from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import type {
	AuthServiceValidatedUser,
	ControllerApiResponse
} from '@repo/shared'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { DashboardService } from './dashboard.service'

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
	constructor(
		@Optional() private readonly dashboardService?: DashboardService,
		@Optional() private readonly logger?: Logger
	) {
		// Logger context handled automatically via app-level configuration
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get dashboard statistics for authenticated user' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard statistics retrieved successfully'
	})
	async getStats(
		@CurrentUser() user?: AuthServiceValidatedUser
	): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				action: 'getStats',
				userId: user?.id
			},
			'Getting dashboard stats for authenticated user'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
		}

		if (!user?.id) {
			throw new NotFoundException('User not authenticated')
		}

		const data = await this.dashboardService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Dashboard statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('activity')
	@ApiOperation({ summary: 'Get recent dashboard activity' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard activity retrieved successfully'
	})
	async getActivity(
		@CurrentUser() user?: AuthServiceValidatedUser
	): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				dashboard: {
					action: 'getActivity',
					userId: user?.id
				}
			},
			'Getting dashboard activity via DashboardService'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
		}

		const data = await this.dashboardService.getActivity(
			user?.id || 'test-user-id'
		)

		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('billing/insights')
	@ApiOperation({
		summary: 'Get comprehensive billing insights from Stripe Sync Engine',
		description:
			'Advanced analytics including revenue, churn, MRR, and customer lifetime value'
	})
	@ApiQuery({
		name: 'startDate',
		required: false,
		type: String,
		description:
			'Start date for analytics (ISO string, defaults to 12 months ago)'
	})
	@ApiQuery({
		name: 'endDate',
		required: false,
		type: String,
		description: 'End date for analytics (ISO string, defaults to now)'
	})
	@ApiResponse({
		status: 200,
		description:
			'Billing insights retrieved successfully from Stripe Sync Engine data'
	})
	@ApiResponse({
		status: 404,
		description: 'Stripe Sync Engine not configured or no data available'
	})
	async getBillingInsights(
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string
	): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				dashboard: {
					action: 'getBillingInsights',
					dateRange: { startDate, endDate }
				}
			},
			'Getting billing insights via DashboardService'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
		}

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

	@Get('billing/health')
	@Public()
	@ApiOperation({
		summary: 'Check if billing insights are available',
		description: 'Health check for Stripe Sync Engine integration'
	})
	@ApiResponse({
		status: 200,
		description: 'Billing insights availability status'
	})
	async getBillingHealth(): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				dashboard: {
					action: 'getBillingHealth'
				}
			},
			'Checking billing insights availability via DashboardService'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
		}

		const isAvailable = await this.dashboardService.isBillingInsightsAvailable()

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

	@Get('property-performance')
	@ApiOperation({
		summary: 'Get per-property performance metrics',
		description:
			'Returns sorted property performance data including occupancy rates, unit counts, and revenue'
	})
	@ApiResponse({
		status: 200,
		description: 'Property performance metrics retrieved successfully'
	})
	async getPropertyPerformance(
		@CurrentUser() user?: AuthServiceValidatedUser
	): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				dashboard: {
					action: 'getPropertyPerformance',
					userId: user?.id || 'test-user-id'
				}
			},
			'Getting property performance via DashboardService'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
		}

		const data = await this.dashboardService.getPropertyPerformance(
			user?.id || 'test-user-id'
		)

		return {
			success: true,
			data,
			message: 'Property performance retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('uptime')
	@Public()
	@ApiOperation({
		summary: 'Get system uptime and SLA metrics',
		description: 'Returns current system uptime percentage and SLA status'
	})
	@ApiResponse({
		status: 200,
		description: 'System uptime metrics retrieved successfully'
	})
	async getUptime(): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				dashboard: {
					action: 'getUptime'
				}
			},
			'Getting system uptime metrics via DashboardService'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
		}

		const data = await this.dashboardService.getUptime()

		return {
			success: true,
			data,
			message: 'System uptime retrieved successfully',
			timestamp: new Date()
		}
	}
}
