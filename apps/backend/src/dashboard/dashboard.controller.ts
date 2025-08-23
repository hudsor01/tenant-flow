import { Controller, Get, Logger, UseGuards } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { AuthToken } from '../shared/decorators/auth-token.decorator'
import type { ValidatedUser } from '../auth/auth.service'
import { createSuccessResponse } from '../shared/utils/api-response'

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
	private readonly logger = new Logger(DashboardController.name)

	constructor(private readonly dashboardService: DashboardService) {}

	/**
	 * Get dashboard statistics
	 */
	@Get('stats')
	async getStats(
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	) {
		this.logger.log(`Getting dashboard stats for user ${user.id}`)

		const stats = await this.dashboardService.getStats(user.id, authToken)

		return createSuccessResponse(
			stats,
			'Dashboard statistics retrieved successfully'
		)
	}

	/**
	 * Get dashboard activity feed
	 */
	@Get('activity')
	async getActivity(
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	) {
		this.logger.log(`Getting dashboard activity for user ${user.id}`)

		const activity = await this.dashboardService.getActivity(
			user.id,
			authToken
		)

		return createSuccessResponse(
			activity,
			'Dashboard activity retrieved successfully'
		)
	}
}
