import {
	Controller,
	Get,
	Logger,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import type { authUser } from '@repo/shared/types/api-contracts'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'
import { OccupancyTrendsService } from './occupancy-trends.service'

@Controller('analytics')
export class OccupancyTrendsController {
	private readonly logger = new Logger(OccupancyTrendsController.name)

	constructor(
		private readonly occupancyTrendsService: OccupancyTrendsService,
		private readonly supabaseService: SupabaseService
	) {}

	private async getAuthenticatedUser(request: Request): Promise<authUser> {
		const user = await this.supabaseService.getUser(request)
		if (!user) {
			this.logger.warn('Occupancy analytics request missing authentication', {
				endpoint: request.path,
				method: request.method
			})
			throw new UnauthorizedException('Authentication required')
		}

		return user as unknown as authUser
	}

	@Get('occupancy-trends')
	async getTrends(@Req() request: Request): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.occupancyTrendsService.getOccupancyTrends(user.id)

		return {
			success: true,
			data,
			message: 'Occupancy trends retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('vacancy-analysis')
	async getVacancyAnalysis(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.occupancyTrendsService.getVacancyAnalysis(user.id)

		return {
			success: true,
			data,
			message: 'Vacancy analysis retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('occupancy/page-data')
	async getPageData(@Req() request: Request): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data =
			await this.occupancyTrendsService.getOccupancyAnalyticsPageData(user.id)

		return {
			success: true,
			data,
			message: 'Occupancy analytics page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
