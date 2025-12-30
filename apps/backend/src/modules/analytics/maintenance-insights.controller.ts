import { Controller, Get, Request } from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { MaintenanceInsightsService } from './maintenance-insights.service'

@ApiTags('Analytics')
@ApiBearerAuth('supabase-auth')
@Controller('analytics')
export class MaintenanceInsightsController {
	constructor(
		private readonly maintenanceInsightsService: MaintenanceInsightsService
	) {}

	@ApiOperation({
		summary: 'Get maintenance metrics',
		description:
			'Retrieves maintenance metrics including request counts, response times, and completion rates for the authenticated owner.'
	})
	@ApiResponse({
		status: 200,
		description: 'Maintenance metrics retrieved successfully'
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('maintenance-metrics')
	async getMaintenanceMetrics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.maintenanceInsightsService.getMaintenanceMetrics(userId)

		return {
			success: true,
			data,
			message: 'Maintenance metrics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({
		summary: 'Get maintenance analytics',
		description:
			'Retrieves detailed maintenance analytics including trends, category breakdowns, and cost analysis for the authenticated owner.'
	})
	@ApiResponse({
		status: 200,
		description: 'Maintenance analytics retrieved successfully'
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('maintenance-analytics')
	async getMaintenanceAnalytics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.maintenanceInsightsService.getMaintenanceAnalytics(userId)

		return {
			success: true,
			data,
			message: 'Maintenance analytics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({
		summary: 'Get maintenance insights page data',
		description:
			'Retrieves combined maintenance insights data for the dashboard page, including metrics, analytics, and recent requests.'
	})
	@ApiResponse({
		status: 200,
		description: 'Maintenance insights page data retrieved successfully'
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('maintenance/page-data')
	async getMaintenancePageData(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
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
