import {
    Controller,
    Get,
    Logger,
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
		private readonly dashboardService: DashboardService,
		private readonly supabaseService: SupabaseService
	) {}

	/**
	 * Helper method to get authenticated user from request
	 * Uses Supabase's native auth.getUser() method
	 */
	private async getAuthenticatedUser(request: Request): Promise<authUser> {
		const user = await this.supabaseService.getUser(request)
		if (!user) {
			this.logger.warn('User authentication failed in DashboardController', {
				endpoint: request.path,
				method: request.method,
				headers: {
					origin: request.headers.origin,
					referer: request.headers.referer,
					hasAuthHeader: !!request.headers.authorization,
					cookieCount: Object.keys(request.cookies || {}).length
				}
			})
			throw new UnauthorizedException('Authentication required')
		}

		return user
	}

	@Get('stats')
	// @ApiOperation({ summary: 'Get dashboard statistics for authenticated user' })
	// @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
	async getStats(@Req() request: Request): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)

		this.logger?.log(
			{
				action: 'getStats',
				userId: user.id
			},
			'Getting dashboard stats for authenticated user'
		)

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
		const user = await this.getAuthenticatedUser(request)

		this.logger?.log(
			{
				dashboard: {
					action: 'getActivity',
					userId: user.id
				}
			},
			'Getting dashboard activity via DashboardService'
		)

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
		const user = await this.getAuthenticatedUser(request)

		this.logger?.log(
			{
				dashboard: {
					action: 'getPropertyPerformance',
					userId: user.id
				}
			},
			'Getting property performance via DashboardService'
		)

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

		const data = await this.dashboardService.getUptime()

		return {
			success: true,
			data,
			message: 'System uptime retrieved successfully',
			timestamp: new Date()
		}
	}
}
