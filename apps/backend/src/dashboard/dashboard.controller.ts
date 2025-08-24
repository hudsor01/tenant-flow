import { Controller, Get, Logger, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UnifiedAuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { AuthToken } from '../shared/decorators/auth-token.decorator'
import type { ValidatedUser } from '../auth/auth.service'
import { DashboardService } from './dashboard.service'
import type { ControllerApiResponse } from '@repo/shared'

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(UnifiedAuthGuard)
export class DashboardController {
	private readonly logger = new Logger(DashboardController.name)

	constructor(private readonly dashboardService: DashboardService) {}

	@Get('stats')
	@ApiOperation({ summary: 'Get dashboard statistics' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard statistics retrieved successfully'
	})
	async getStats(
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse> {
		this.logger.log(`Getting dashboard stats for user ${user.id}`)
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
	getActivity(
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): ControllerApiResponse {
		this.logger.log(`Getting dashboard activity for user ${user.id}`)
		const data = this.dashboardService.getActivity(user.id, authToken)
		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date()
		}
	}
}
