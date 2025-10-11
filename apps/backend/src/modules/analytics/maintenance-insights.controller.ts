import {
	Controller,
	Get,
	Logger,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import type { authUser } from '@repo/shared/types/backend-domain'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'
import { MaintenanceInsightsService } from './maintenance-insights.service'

@Controller('analytics')
export class MaintenanceInsightsController {
	private readonly logger = new Logger(MaintenanceInsightsController.name)

	constructor(
		private readonly maintenanceInsightsService: MaintenanceInsightsService,
		private readonly supabaseService: SupabaseService
	) {}

	private async getAuthenticatedUser(request: Request): Promise<authUser> {
		const user = await this.supabaseService.getUser(request)
		if (!user) {
			this.logger.warn('Maintenance analytics request missing authentication', {
				endpoint: request.path,
				method: request.method
			})
			throw new UnauthorizedException('Authentication required')
		}

		return user as unknown as authUser
	}

	@Get('maintenance-metrics')
	async getMaintenanceMetrics(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.maintenanceInsightsService.getMaintenanceMetrics(
			user.id
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
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.maintenanceInsightsService.getMaintenanceAnalytics(
			user.id
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
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data =
			await this.maintenanceInsightsService.getMaintenanceInsightsPageData(
				user.id
			)

		return {
			success: true,
			data,
			message: 'Maintenance insights page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
