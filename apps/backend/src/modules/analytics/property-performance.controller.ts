import { Controller, Get, Request } from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { PropertyPerformanceService } from './property-performance.service'

@ApiTags('Analytics')
@ApiBearerAuth('supabase-auth')
@Controller('analytics')
export class PropertyPerformanceController {
	constructor(
		private readonly propertyPerformanceService: PropertyPerformanceService
	) {}

	@ApiOperation({
		summary: 'Get property performance',
		description:
			'Retrieves property performance metrics including occupancy rates, revenue, and maintenance costs for the authenticated owner.'
	})
	@ApiResponse({
		status: 200,
		description: 'Property performance retrieved successfully'
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('property-performance')
	async getPropertyPerformance(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.propertyPerformanceService.getPropertyPerformance(userId)

		return {
			success: true,
			data,
			message: 'Property performance retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({
		summary: 'Get property units',
		description:
			'Retrieves unit-level data for all properties including status, tenant info, and lease details for the authenticated owner.'
	})
	@ApiResponse({
		status: 200,
		description: 'Property units retrieved successfully'
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('property-units')
	async getPropertyUnits(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data = await this.propertyPerformanceService.getPropertyUnits(userId)

		return {
			success: true,
			data,
			message: 'Property units retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({
		summary: 'Get unit statistics',
		description:
			'Retrieves aggregated statistics across all units including occupancy, vacancy rates, and average rent for the authenticated owner.'
	})
	@ApiResponse({
		status: 200,
		description: 'Unit statistics retrieved successfully'
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('property-unit-statistics')
	async getUnitStatistics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data = await this.propertyPerformanceService.getUnitStatistics(userId)

		return {
			success: true,
			data,
			message: 'Unit statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({
		summary: 'Get visitor analytics',
		description:
			'Retrieves visitor and prospect analytics including inquiry sources, conversion rates, and viewing statistics.'
	})
	@ApiResponse({
		status: 200,
		description: 'Visitor analytics retrieved successfully'
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('visitor-analytics')
	async getVisitorAnalytics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.propertyPerformanceService.getVisitorAnalytics(userId)

		return {
			success: true,
			data,
			message: 'Visitor analytics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({
		summary: 'Get property performance page data',
		description:
			'Retrieves combined property performance data for the dashboard page, including metrics, unit data, and analytics.'
	})
	@ApiResponse({
		status: 200,
		description: 'Property performance page data retrieved successfully'
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('property-performance/page-data')
	async getPropertyPerformancePageData(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
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
