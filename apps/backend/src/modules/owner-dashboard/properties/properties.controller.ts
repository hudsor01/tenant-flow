import {
	Controller,
	Get,
	Req,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'

import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { DashboardPerformanceService } from '../../dashboard/dashboard-performance.service'
import { RolesGuard } from '../../../shared/guards/roles.guard'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * PropertiesController
 *
 * Handles owner property analytics:
 * - Property performance metrics
 * - Portfolio statistics
 */
@ApiTags('Owner Dashboard - Properties')
@ApiBearerAuth('supabase-auth')
@UseGuards(RolesGuard)
@Roles('OWNER')
@UseInterceptors(OwnerContextInterceptor)
@Controller('')
export class PropertiesController {
	constructor(
		private readonly dashboardPerformanceService: DashboardPerformanceService,
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	@ApiOperation({ summary: 'Get property performance', description: 'Retrieve property performance metrics and statistics' })
	@ApiResponse({ status: 200, description: 'Property performance retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('performance')
	async getPropertyPerformance(
		@Req() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = req.user.id
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting property performance', { user_id })

		const data = await this.dashboardPerformanceService.getPropertyPerformance(
			user_id,
			token
		)

		return {
			success: true,
			data,
			message: 'Property performance retrieved successfully',
			timestamp: new Date()
		}
	}
}
