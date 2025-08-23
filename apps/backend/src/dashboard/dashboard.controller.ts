<<<<<<< HEAD
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
=======
import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UnifiedAuthGuard } from '../shared/guards/unified-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { DashboardService } from './dashboard.service'
import type { ControllerApiResponse } from '@repo/shared'

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(UnifiedAuthGuard)
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get('stats')
	@ApiOperation({ summary: 'Get dashboard statistics' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard statistics retrieved successfully'
	})
	async getStats(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.dashboardService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Dashboard statistics retrieved successfully',
			timestamp: new Date().toISOString()
		}
	}

	@Get('activity')
	@ApiOperation({ summary: 'Get recent dashboard activity' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard activity retrieved successfully'
	})
	async getActivity(
		@CurrentUser() user: ValidatedUser,
	): Promise<ControllerApiResponse> {
		const data = await this.dashboardService.getActivity(user.id)
		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date().toISOString()
		}
	}
}
>>>>>>> origin/copilot/vscode1755830877462
