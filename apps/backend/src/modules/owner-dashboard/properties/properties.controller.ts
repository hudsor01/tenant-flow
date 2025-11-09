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
 * PropertiesController
 *
 * Handles owner property analytics:
 * - Property performance metrics
 * - Portfolio statistics
 */
@UseGuards(OwnerAuthGuard)
@UseInterceptors(OwnerContextInterceptor)
@Controller('properties')
export class PropertiesController {
	private readonly logger = new Logger(PropertiesController.name)

	constructor(
		private readonly dashboardService: DashboardService,
		private readonly supabase: SupabaseService
	) {}

	@Get('performance')
	async getPropertyPerformance(
		@Req() req: AuthenticatedRequest,
		@UserId() userId: string
	): Promise<ControllerApiResponse> {
		const token = this.supabase.getTokenFromRequest(req)

		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}

		this.logger.log('Getting property performance', { userId })

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
}
