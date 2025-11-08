import {
	Controller,
	Get,
	HttpException,
	Logger,
	Query,
	Req,
	Request,
	UnauthorizedException,
	InternalServerErrorException
} from '@nestjs/common'
import { UserId } from '../../shared/decorators/user.decorator'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { DashboardService } from './dashboard.service'
import { SupabaseService } from '../../database/supabase.service'

// Validation schemas removed - service handles validation

/**
 * DEPRECATED: This controller uses legacy /manage routes.
 * 
 * Migration: Use /owner routes from OwnerDashboardModule instead.
 * - /manage/stats → /owner/analytics/stats
 * - /manage/activity → /owner/analytics/activity
 * - /manage/billing/insights → /owner/financial/billing/insights
 * - /manage/property-performance → /owner/properties/performance
 * - /manage/maintenance-analytics → /owner/maintenance/analytics
 * - /manage/occupancy-trends → /owner/tenants/occupancy-trends
 * - /manage/revenue-trends → /owner/financial/revenue-trends
 * - /manage/time-series → /owner/reports/time-series
 * - /manage/metric-trend → /owner/reports/metric-trend
 * 
 * Sunset Date: 2025-09-01
 * See: apps/backend/src/modules/owner-dashboard/README.md
 */
@Controller('manage')
export class DashboardController {
	private readonly logger = new Logger(DashboardController.name)

	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService
	) {}

	@Get('stats')
	// NOTE: Caching disabled - @CacheKey doesn't support per-user keys
	// User-specific data cannot use global cache without exposing data across users
	async getStats(
		@Request() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined

		this.logger?.log(
			{
				action: 'getStats',
				userId
			},
			'Getting dashboard stats for authenticated user'
		)

		const data = await this.dashboardService.getStats(userId, token)
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
	async getPageData(
		@Request() req: AuthenticatedRequest,
		@UserId() userId: string
	) {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			this.logger.warn('Dashboard page data requested without token')
			throw new UnauthorizedException('Authentication token missing')
		}

		try {
			// Fetch all dashboard data in parallel
			const [stats, activity] = await Promise.all([
				this.dashboardService.getStats(userId, token),
				this.dashboardService.getActivity(userId, token)
			])

			return {
				stats,
				activity: activity.activities
				// Note: propertyStats, tenantStats, leaseStats are already included in stats
				// Frontend can extract them from stats.properties, stats.tenants, stats.leases
			}
		} catch (error) {
			this.logger.error('Failed to fetch dashboard page data', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			// Re-throw HTTP exceptions as-is to preserve specific error messages
			if (error instanceof HttpException) {
				throw error
			}
			throw new InternalServerErrorException('Failed to fetch dashboard data')
		}
	}

	@Get('activity')
	async getActivity(
		@Request() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('Dashboard activity requested without token')
			throw new UnauthorizedException('Authentication token missing')
		}
		this.logger?.log(
			{
				dashboard: {
					action: 'getActivity',
					userId: userId
				}
			},
			'Getting dashboard activity via DashboardService'
		)
		const data = await this.dashboardService.getActivity(userId, token!)
		// Service handles validation, return data directly
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
		@UserId() userId: string,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined
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
			token,
			parsedStartDate,
			parsedEndDate
		)
		// Service handles validation, return data directly
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

		this.logger?.log(
			{
				dashboard: {
					action: 'checkBillingInsightsAvailability',
					userId
				}
			},
			'Checking billing insights availability'
		)

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
		@Request() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			this.logger.warn('Billing health check requested without token')
			throw new UnauthorizedException('Authentication token missing')
		}

		this.logger?.log(
			{
				dashboard: {
					action: 'getBillingHealth'
				}
			},
			'Checking billing insights availability via DashboardService'
		)

		const isAvailable = await this.dashboardService.isBillingInsightsAvailable(
			userId,
			token!
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

	@Get('property-performance')
	async getPropertyPerformance(
		@Request() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined

		this.logger?.log(
			{
				dashboard: {
					action: 'getPropertyPerformance',
					userId: userId
				}
			},
			'Getting property performance via DashboardService'
		)

		const data = await this.dashboardService.getPropertyPerformance(
			userId,
			token
		)

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
		@UserId() userId: string,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined
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
			token,
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
		@UserId() userId: string,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined
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

	/**
	 * Get time-series data for dashboard charts
	 */
	@Get('time-series')
	async getTimeSeries(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string,
		@Query('metric') metric: string,
		@Query('days') days?: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined

		if (!metric) {
			return {
				success: false,
				data: null,
				message: 'metric parameter is required',
				timestamp: new Date()
			}
		}

		const parsedDays = days ? parseInt(days, 10) : 30
		this.logger?.log(
			{
				dashboard: {
					action: 'getTimeSeries',
					userId: userId,
					metric,
					days: parsedDays
				}
			},
			'Getting time-series data via RPC'
		)

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

	/**
	 * Get metric trend comparing current vs previous period
	 */
	@Get('metric-trend')
	async getMetricTrend(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string,
		@Query('metric') metric: string,
		@Query('period') period?: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined

		if (!metric) {
			return {
				success: false,
				data: null,
				message: 'metric parameter is required',
				timestamp: new Date()
			}
		}

		const validPeriod = period || 'month'
		this.logger?.log(
			{
				dashboard: {
					action: 'getMetricTrend',
					userId: userId,
					metric,
					period: validPeriod
				}
			},
			'Getting metric trend via RPC'
		)

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

	@Get('maintenance-analytics')
	async getMaintenanceAnalytics(
		@Request() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined

		this.logger?.log(
			{
				dashboard: {
					action: 'getMaintenanceAnalytics',
					userId: userId
				}
			},
			'Getting maintenance analytics via optimized RPC'
		)

		const data = await this.dashboardService.getMaintenanceAnalytics(
			userId,
			token
		)

		return {
			success: true,
			data,
			message: 'Maintenance analytics retrieved successfully',
			timestamp: new Date()
		}
	}
}
