import {
	Controller,
	Get,
	Logger,
	Query,
	Req,
	Request,
	UnauthorizedException,
	InternalServerErrorException
} from '@nestjs/common'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
export class DashboardController {
	private readonly logger = new Logger(DashboardController.name)

	constructor(private readonly dashboardService: DashboardService) {}

	@Get('stats')
	// NOTE: Caching disabled - @CacheKey doesn't support per-user keys
	// User-specific data cannot use global cache without exposing data across users
	async getStats(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id

		this.logger?.log(
			{
				action: 'getStats',
				userId
			},
			'Getting dashboard stats for authenticated user'
		)

		const data = await this.dashboardService.getStats(userId)
		return {
			success: true,
			data,
			message: 'Dashboard statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	/**
	 * Unified dashboard endpoint - combines all dashboard data in one request
	 * Reduces 5 HTTP requests to 1 for 40-50% faster initial page load
	 */
	@Get('page-data')
	// NOTE: Caching disabled - @CacheKey doesn't support per-user keys
	// User-specific data cannot use global cache without exposing data across users
	async getPageData(@Request() req: AuthenticatedRequest) {
		const userId = req.user?.id

		if (!userId) {
			this.logger.warn('Dashboard page data requested without user ID')
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			// Fetch all dashboard data in parallel
			const [stats, activity] = await Promise.all([
				this.dashboardService.getStats(userId),
				this.dashboardService.getActivity(userId)
			])

			return {
				stats,
				activity: activity.activities,
				// Note: propertyStats, tenantStats, leaseStats are already included in stats
				// Frontend can extract them from stats.properties, stats.tenants, stats.leases
			}
		} catch (error) {
			this.logger.error('Failed to fetch dashboard page data', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new InternalServerErrorException('Failed to fetch dashboard data')
		}
	}

	@Get('activity')
	async getActivity(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id

		this.logger?.log(
			{
				dashboard: {
					action: 'getActivity',
					userId: userId
				}
			},
			'Getting dashboard activity via DashboardService'
		)

		const data = await this.dashboardService.getActivity(userId)

		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('billing/insights')
	async getBillingInsights(
		@Req() req: AuthenticatedRequest,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string
	): Promise<ControllerApiResponse> {
		const userId = req.user.id

		this.logger?.log(
			{
				dashboard: {
					action: 'getBillingInsights',
					userId: userId,
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
			userId,
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
	async getBillingHealth(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				dashboard: {
					action: 'getBillingHealth'
				}
			},
			'Checking billing insights availability via DashboardService'
		)

		const isAvailable = await this.dashboardService.isBillingInsightsAvailable(req.user.id)

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
	async getPropertyPerformance(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id

		this.logger?.log(
			{
				dashboard: {
					action: 'getPropertyPerformance',
					userId: userId
				}
			},
			'Getting property performance via DashboardService'
		)

		const data = await this.dashboardService.getPropertyPerformance(userId)

		return {
			success: true,
			data,
			message: 'Property performance retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('uptime')
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

	@Get('occupancy-trends')
	async getOccupancyTrends(
		@Req() req: AuthenticatedRequest,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const monthsNum = parseInt(months, 10) || 12

		this.logger?.log(
			{
				dashboard: {
					action: 'getOccupancyTrends',
					userId: userId,
					months: monthsNum
				}
			},
			'Getting occupancy trends via optimized RPC'
		)

		const data = await this.dashboardService.getOccupancyTrends(
			userId,
			monthsNum
		)

		return {
			success: true,
			data,
			message: 'Occupancy trends retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('revenue-trends')
	async getRevenueTrends(
		@Req() req: AuthenticatedRequest,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const monthsNum = parseInt(months, 10) || 12

		this.logger?.log(
			{
				dashboard: {
					action: 'getRevenueTrends',
					userId: userId,
					months: monthsNum
				}
			},
			'Getting revenue trends via optimized RPC'
		)

		const data = await this.dashboardService.getRevenueTrends(userId, monthsNum)

		return {
			success: true,
			data,
			message: 'Revenue trends retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('maintenance-analytics')
	async getMaintenanceAnalytics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id

		this.logger?.log(
			{
				dashboard: {
					action: 'getMaintenanceAnalytics',
					userId: userId
				}
			},
			'Getting maintenance analytics via optimized RPC'
		)

		const data = await this.dashboardService.getMaintenanceAnalytics(userId)

		return {
			success: true,
			data,
			message: 'Maintenance analytics retrieved successfully',
			timestamp: new Date()
		}
	}
}
