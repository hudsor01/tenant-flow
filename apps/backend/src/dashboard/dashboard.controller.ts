import { Controller, Get, UseGuards, Inject, forwardRef } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { AuthToken } from '../shared/decorators/auth-token.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { DashboardService } from './dashboard.service'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthServiceValidatedUser } from '@repo/shared'

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
	constructor(
		@Inject(forwardRef(() => DashboardService)) private readonly dashboardService: DashboardService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	@Get('stats')
	@Public()
	@ApiOperation({ summary: 'Get dashboard statistics' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard statistics retrieved successfully'
	})
	async getStats(): Promise<ControllerApiResponse> {
		// Safe logger call with fallback to console
		if (this.logger?.info) {
			this.logger.info(
				{
					dashboard: {
						action: 'getStats'
					}
				},
				`Getting dashboard stats (public endpoint)`
			)
		} else {
			console.log('Getting dashboard stats (public endpoint)')
		}
		console.log('DashboardController: dashboardService is:', typeof this.dashboardService)
		const data = await this.dashboardService.getStats()
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
		// Safe logger call with fallback to console
		if (this.logger?.info) {
			this.logger.info(`Getting dashboard activity for user ${user.id}`)
		} else {
			console.log(`Getting dashboard activity for user ${user.id}`)
		}
		const data = await this.dashboardService.getActivity(user.id, authToken)
		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date()
		}
	}
}
