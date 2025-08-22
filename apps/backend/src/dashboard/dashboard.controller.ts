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