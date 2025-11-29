import { Controller, Get } from '@nestjs/common'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import { user_id } from '../../shared/decorators/user.decorator'
import { MaintenanceInsightsService } from './maintenance-insights.service'

@Controller('analytics')
export class MaintenanceInsightsController {
	constructor(
		private readonly maintenanceInsightsService: MaintenanceInsightsService
	) {}

	@Get('maintenance-metrics')
	async getMaintenanceMetrics(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.maintenanceInsightsService.getMaintenanceMetrics(
			userId
		)

		return {
			success: true,
			data,
			message: 'Maintenance metrics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('maintenance-analytics')
	async getMaintenanceAnalytics(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.maintenanceInsightsService.getMaintenanceAnalytics(
			userId
		)

		return {
			success: true,
			data,
			message: 'Maintenance analytics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('maintenance/page-data')
	async getMaintenancePageData(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data =
			await this.maintenanceInsightsService.getMaintenanceInsightsPageData(
				userId
			)

		return {
			success: true,
			data,
			message: 'Maintenance insights page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
