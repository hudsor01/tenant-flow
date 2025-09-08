import { Controller, Get, UseGuards, Inject, forwardRef, Query } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { AuthToken } from '../shared/decorators/auth-token.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { DashboardService } from './dashboard.service'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthServiceValidatedUser } from '@repo/shared'

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
	constructor(
		@Inject(forwardRef(() => DashboardService)) private readonly dashboardService: DashboardService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	@Get('stats')
	@Public()
	@ApiOperation({ summary: 'Get dashboard statistics' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard statistics retrieved successfully'
	})
	async getStats(): Promise<ControllerApiResponse> {
		// Safe logger call with fallback to console
		if (this.logger?.info) {
			this.logger.info(
				{
					dashboard: {
						action: 'getStats'
					}
				},
				`Getting dashboard stats (public endpoint)`
			)
		} else {
			console.log('Getting dashboard stats (public endpoint)')
		}
		console.log('DashboardController: dashboardService is:', typeof this.dashboardService)
		const data = await this.dashboardService.getStats()
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
		@CurrentUser() user: AuthServiceValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse> {
		// Safe logger call with fallback to console
		if (this.logger?.info) {
			this.logger.info(`Getting dashboard activity for user ${user.id}`)
		} else {
			console.log(`Getting dashboard activity for user ${user.id}`)
		}
		const data = await this.dashboardService.getActivity(user.id, authToken)
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
		description: 'Advanced analytics including revenue, churn, MRR, and customer lifetime value'
	})
	@ApiQuery({
		name: 'startDate',
		required: false,
		type: String,
		description: 'Start date for analytics (ISO string, defaults to 12 months ago)'
	})
	@ApiQuery({
		name: 'endDate',
		required: false,
		type: String,
		description: 'End date for analytics (ISO string, defaults to now)'
	})
	@ApiResponse({
		status: 200,
		description: 'Billing insights retrieved successfully from Stripe Sync Engine data'
	})
	@ApiResponse({
		status: 404,
		description: 'Stripe Sync Engine not configured or no data available'
	})
	async getBillingInsights(
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string
	): Promise<ControllerApiResponse> {
		if (this.logger?.info) {
			this.logger.info('Getting billing insights from Stripe Sync Engine', {
				dateRange: { startDate, endDate }
			})
		} else {
			console.log('Getting billing insights from Stripe Sync Engine', { startDate, endDate })
		}

		const parsedStartDate = startDate ? new Date(startDate) : undefined
		const parsedEndDate = endDate ? new Date(endDate) : undefined

		const data = await this.dashboardService.getBillingInsights(parsedStartDate, parsedEndDate)

		if (!data) {
			return {
				success: false,
				data: null,
				message: 'Billing insights not available - Stripe Sync Engine not configured or no data',
				timestamp: new Date()
			}
		}

		return {
			success: true,
			data,
			message: 'Billing insights retrieved successfully from Stripe Sync Engine',
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
		const isAvailable = await this.dashboardService.isBillingInsightsAvailable()

		return {
			success: true,
			data: { 
				available: isAvailable,
				service: 'Stripe Sync Engine',
				capabilities: isAvailable ? [
					'Revenue Analytics',
					'Churn Analysis', 
					'Customer Lifetime Value',
					'MRR Tracking',
					'Subscription Status Breakdown'
				] : []
			},
			message: isAvailable 
				? 'Billing insights are available' 
				: 'Billing insights not available - Stripe Sync Engine not configured',
			timestamp: new Date()
		}
	}
}
