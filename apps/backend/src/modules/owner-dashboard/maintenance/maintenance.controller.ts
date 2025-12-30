import {
	Controller,
	Get,
	Req,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { user_id } from '../../../shared/decorators/user.decorator'
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

	@Get('analytics')
	async getMaintenanceAnalytics(
		@Req() req: AuthenticatedRequest,
		@user_id() user_id: string
	): Promise<ControllerApiResponse> {
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
