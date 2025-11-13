import {
	Controller,
	Get,
	Logger,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import type { AuthUser } from '@repo/shared/types/api-contracts'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'
import { PropertyPerformanceService } from './property-performance.service'

@Controller('analytics')
export class PropertyPerformanceController {
	private readonly logger = new Logger(PropertyPerformanceController.name)

	constructor(
		private readonly propertyPerformanceService: PropertyPerformanceService,
		private readonly supabaseService: SupabaseService
	) {}

	private async getAuthenticatedUser(request: Request): Promise<AuthUser> {
		const user = await this.supabaseService.getUser(request)
		if (!user) {
			this.logger.warn('Property performance request missing authentication', {
				endpoint: request.path,
				method: request.method
			})
			throw new UnauthorizedException('Authentication required')
		}

		return user as unknown as AuthUser
	}

	@Get('property-performance')
	async getPropertyPerformance(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.propertyPerformanceService.getPropertyPerformance(
			user.id
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
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.propertyPerformanceService.getPropertyUnits(user.id)

		return {
			success: true,
			data,
			message: 'Property units retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('property-unit-statistics')
	async getUnitStatistics(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.propertyPerformanceService.getUnitStatistics(
			user.id
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
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.propertyPerformanceService.getVisitorAnalytics(
			user.id
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
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data =
			await this.propertyPerformanceService.getPropertyPerformancePageData(
				user.id
			)

		return {
			success: true,
			data,
			message: 'Property performance analytics retrieved successfully',
			timestamp: new Date()
		}
	}
}
