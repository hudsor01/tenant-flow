import {
    Controller,
    Get,
    Logger,
    NotFoundException,
    Optional,
    Query,
    Req,
    UnauthorizedException
} from '@nestjs/common'
// Swagger imports removed
import type { ControllerApiResponse, authUser } from '@repo/shared'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { DashboardService } from './dashboard.service'

// @ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
	private readonly logger = new Logger(DashboardController.name)

	constructor(
		@Optional() private readonly dashboardService?: DashboardService,
		private readonly supabaseService?: SupabaseService
	) {}

	/**
	 * Helper method to validate user from request
	 */
	private async validateUser(request: Request): Promise<authUser> {
		if (!this.supabaseService) {
			throw new NotFoundException('Authentication service not available')
		}

		const user = await this.supabaseService.validateUser(request)
		if (!user) {
			throw new UnauthorizedException('Authentication required')
		}

		return user
	}

	@Get('stats')
	// @ApiOperation({ summary: 'Get dashboard statistics for authenticated user' })
	// @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
	async getStats(@Req() request: Request): Promise<ControllerApiResponse> {
		const user = await this.validateUser(request)

		this.logger?.log(
			{
				action: 'getStats',
				userId: user.id
			},
			'Getting dashboard stats for authenticated user'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
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
	// @ApiOperation({ summary: 'Get recent dashboard activity' })
	// @ApiResponse({ status: 200, description: 'Dashboard activity retrieved successfully' })
	async getActivity(@Req() request: Request): Promise<ControllerApiResponse> {
		const user = await this.validateUser(request)

		this.logger?.log(
			{
				dashboard: {
					action: 'getActivity',
					userId: user.id
				}
			},
			'Getting dashboard activity via DashboardService'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
		}

		const data = await this.dashboardService.getActivity(user.id)

		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('billing/insights')
	// @ApiOperation({ summary: 'Get comprehensive billing insights from Stripe Sync Engine' })
	// @ApiQuery({ name: 'startDate', required: false, type: String })
	// @ApiQuery({ name: 'endDate', required: false, type: String })
	// @ApiResponse({ status: 200, description: 'Billing insights retrieved successfully' })
	// @ApiResponse({ status: 404, description: 'Stripe Sync Engine not configured' })
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
	// @ApiOperation({ summary: 'Check if billing insights are available' })
	// @ApiResponse({ status: 200, description: 'Billing insights availability status' })
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
	// @ApiOperation({ summary: 'Get per-property performance metrics' })
	// @ApiResponse({ status: 200, description: 'Property performance metrics retrieved successfully' })
	async getPropertyPerformance(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.validateUser(request)

		this.logger?.log(
			{
				dashboard: {
					action: 'getPropertyPerformance',
					userId: user.id
				}
			},
			'Getting property performance via DashboardService'
		)

		if (!this.dashboardService) {
			throw new NotFoundException('Dashboard service not available')
		}

		const data = await this.dashboardService.getPropertyPerformance(user.id)

		return {
			success: true,
			data,
			message: 'Property performance retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('uptime')
	// @ApiOperation({ summary: 'Get system uptime and SLA metrics' })
	// @ApiResponse({ status: 200, description: 'System uptime metrics retrieved successfully' })
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
