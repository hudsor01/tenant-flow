import {
	Controller,
	Get,
	Req,
	UnauthorizedException,
	Logger,
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
 * MaintenanceController
 *
 * Handles owner maintenance analytics:
 * - Maintenance request statistics
 * - Cost analysis
 * - Response time metrics
 */
@UseGuards(OwnerAuthGuard)
@UseInterceptors(OwnerContextInterceptor)
@Controller('maintenance')
export class MaintenanceController {
	private readonly logger = new Logger(MaintenanceController.name)

	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService
	) {}

	@Get('analytics')
	async getMaintenanceAnalytics(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting maintenance analytics', { userId })

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
