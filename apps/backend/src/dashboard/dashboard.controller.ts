import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { AuthToken } from '../shared/decorators/auth-token.decorator'
import { DashboardService } from './dashboard.service'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthServiceValidatedUser } from '@repo/shared'

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
	constructor(
		private readonly dashboardService: DashboardService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get dashboard statistics' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard statistics retrieved successfully'
	})
	async getStats(
		@CurrentUser() user: AuthServiceValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse> {
		this.logger.info(
			{
				dashboard: {
					userId: user.id,
					action: 'getStats'
				}
			},
			`Getting dashboard stats for user ${user.id}`
		)
		const data = await this.dashboardService.getStats(user.id, authToken)
		return {
			success: true,
			data,
			message: 'Dashboard statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('activity')
	@ApiOperation({ summary: 'Get recent dashboard activity' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard activity retrieved successfully'
	})
	async getActivity(
		@CurrentUser() user: AuthServiceValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse> {
		this.logger.info(`Getting dashboard activity for user ${user.id}`)
		const data = await this.dashboardService.getActivity(user.id, authToken)
		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date()
		}
	}
}
