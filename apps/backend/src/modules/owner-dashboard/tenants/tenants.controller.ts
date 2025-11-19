import {
	Controller,
	Get,
	Query,
	Req,
	UnauthorizedException,
	Logger,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { user_id } from '../../../shared/decorators/user.decorator'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { DashboardService } from '../../dashboard/dashboard.service'
import { OwnerAuthGuard } from '../guards/owner-auth.guard'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'

/**
 * TenantsController
 *
 * Handles owner tenant analytics:
 * - Occupancy trends
 * - Tenant statistics
 */
@UseGuards(OwnerAuthGuard)
@UseInterceptors(OwnerContextInterceptor)
@Controller('tenants')
export class TenantsController {
	private readonly logger = new Logger(TenantsController.name)

	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService
	) {}

	@Get('occupancy-trends')
	async getOccupancyTrends(
		@Req() req: AuthenticatedRequest,
		@user_id() user_id: string,
		@Query('months') months: string = '12'
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		const monthsNum = parseInt(months, 10) || 12

		this.logger.log('Getting occupancy trends', {
			user_id,
			months: monthsNum
		})

		const data = await this.dashboardService.getOccupancyTrends(
			user_id,
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
