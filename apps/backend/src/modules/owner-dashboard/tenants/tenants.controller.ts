import {
	Controller,
	Get,
	Query,
	Req,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'

import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { DashboardTrendsService } from '../../dashboard/dashboard-trends.service'
import { RolesGuard } from '../../../shared/guards/roles.guard'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * TenantsController
 *
 * Handles owner tenant analytics:
 * - Occupancy trends
 * - Tenant statistics
 */
@ApiTags('Owner Dashboard')
@ApiBearerAuth('supabase-auth')
@UseGuards(RolesGuard)
@Roles('OWNER')
@UseInterceptors(OwnerContextInterceptor)
@Controller('')
export class TenantsController {
	constructor(
		private readonly dashboardTrendsService: DashboardTrendsService,
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	@ApiOperation({ summary: 'Get occupancy trends', description: 'Get occupancy trends over time for property owner' })
	@ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default: 12)' })
	@ApiResponse({ status: 200, description: 'Occupancy trends retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('occupancy-trends')
	async getOccupancyTrends(
		@Req() req: AuthenticatedRequest,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		const monthsNum = parseInt(months, 10) || 12

		this.logger.log('Getting occupancy trends', {
			userId,
			months: monthsNum
		})

		const data = await this.dashboardTrendsService.getOccupancyTrends(
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
}
