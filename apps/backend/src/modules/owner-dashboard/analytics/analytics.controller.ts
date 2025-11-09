import {
	Controller,
	Get,
	Req,
	UnauthorizedException,
	Logger,
	HttpException,
	InternalServerErrorException,
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
 * AnalyticsController
 *
 * Handles owner analytics dashboard:
 * - Dashboard statistics
 * - Activity feed
 * - System uptime
 * - Unified page data
 */
@UseGuards(OwnerAuthGuard)
@UseInterceptors(OwnerContextInterceptor)
@Controller('analytics')
export class AnalyticsController {
	private readonly logger = new Logger(AnalyticsController.name)

	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService
	) {}

	@Get('stats')
	async getStats(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req) || undefined

		this.logger.log('Getting dashboard stats', { userId })

		const data = await this.dashboardService.getStats(userId, token)

		return {
			success: true,
			data,
			message: 'Dashboard statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('activity')
	async getActivity(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting dashboard activity', { userId })

		const data = await this.dashboardService.getActivity(userId, token)

		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date()
		}
	}

	/**
	 * Unified dashboard endpoint - combines all dashboard data in one request
	 * Reduces 5 HTTP requests to 1 for 40-50% faster initial page load
	 */
	@Get('page-data')
	async getPageData(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string
	) {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			this.logger.warn('Dashboard page data requested without token')
			throw new UnauthorizedException('Authentication token missing')
		}

		this.logger.log('Getting unified dashboard page data', { userId })

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

	@Get('uptime')
	async getUptime(): Promise<ControllerApiResponse> {
		this.logger.log('Getting system uptime metrics')

		const data = await this.dashboardService.getUptime()

		return {
			success: true,
			data,
			message: 'System uptime retrieved successfully',
			timestamp: new Date()
		}
	}
}
