import { Controller, Get } from '@nestjs/common'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import { user_id } from '../../shared/decorators/user.decorator'
import { PropertyPerformanceService } from './property-performance.service'

@Controller('analytics')
export class PropertyPerformanceController {
	constructor(
		private readonly propertyPerformanceService: PropertyPerformanceService
	) {}

	@Get('property-performance')
	async getPropertyPerformance(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.propertyPerformanceService.getPropertyPerformance(
			userId
		)

		return {
			success: true,
			data,
			message: 'Property performance retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('property-units')
	async getPropertyUnits(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.propertyPerformanceService.getPropertyUnits(userId)

		return {
			success: true,
			data,
			message: 'Property units retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('property-unit-statistics')
	async getUnitStatistics(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.propertyPerformanceService.getUnitStatistics(
			userId
		)

		return {
			success: true,
			data,
			message: 'Unit statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('visitor-analytics')
	async getVisitorAnalytics(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.propertyPerformanceService.getVisitorAnalytics(
			userId
		)

		return {
			success: true,
			data,
			message: 'Visitor analytics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('property-performance/page-data')
	async getPropertyPerformancePageData(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data =
			await this.propertyPerformanceService.getPropertyPerformancePageData(
				userId
			)

		return {
			success: true,
			data,
			message: 'Property performance analytics retrieved successfully',
			timestamp: new Date()
		}
	}
}
