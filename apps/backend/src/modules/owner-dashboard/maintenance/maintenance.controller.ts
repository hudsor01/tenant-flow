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
import { DashboardService } from '../../dashboard/dashboard.service'
import { RolesGuard } from '../../../shared/guards/roles.guard'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * MaintenanceController
 *
 * Handles owner maintenance analytics:
 * - Maintenance request statistics
 * - Cost analysis
 * - Response time metrics
 */
@ApiTags('Owner Dashboard - Maintenance')
@ApiBearerAuth('supabase-auth')
@UseGuards(RolesGuard)
@Roles('OWNER')
@UseInterceptors(OwnerContextInterceptor)
@Controller('')
export class MaintenanceController {
	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	@ApiOperation({ summary: 'Get maintenance analytics', description: 'Retrieve maintenance request statistics and metrics' })
	@ApiResponse({ status: 200, description: 'Maintenance analytics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics')
	async getMaintenanceAnalytics(
		@Req() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = req.user.id
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting maintenance analytics', { user_id })

		const data = await this.dashboardService.getMaintenanceAnalytics(user_id)

		return {
			success: true,
			data,
			message: 'Maintenance analytics retrieved successfully',
			timestamp: new Date()
		}
	}
}
