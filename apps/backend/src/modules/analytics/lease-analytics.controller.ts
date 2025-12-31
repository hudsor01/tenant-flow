import { Controller, Get, Request, UnauthorizedException } from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeaseAnalyticsService } from './lease-analytics.service'

@ApiTags('Analytics')
@ApiBearerAuth('supabase-auth')
@Controller('analytics')
export class LeaseAnalyticsController {
	constructor(private readonly leaseAnalyticsService: LeaseAnalyticsService) {}

	private getuser_id(req: AuthenticatedRequest): string {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('Authentication required')
		}
		return user_id
	}

	@ApiOperation({ summary: 'Get lease analytics', description: 'Retrieve lease analytics with financial data' })
	@ApiResponse({ status: 200, description: 'Lease analytics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('lease-analytics')
	async getLeaseAnalytics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = this.getuser_id(req)
		const data =
			await this.leaseAnalyticsService.getLeasesWithFinancialAnalytics(user_id)

		return {
			success: true,
			data,
			message: 'Lease analytics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get lease summary', description: 'Retrieve lease financial summary' })
	@ApiResponse({ status: 200, description: 'Lease summary retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('lease-summary')
	async getLeaseSummary(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = this.getuser_id(req)
		const data =
			await this.leaseAnalyticsService.getLeaseFinancialSummary(user_id)

		return {
			success: true,
			data,
			message: 'Lease financial summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get lease lifecycle', description: 'Retrieve lease lifecycle data (new, active, expiring, expired)' })
	@ApiResponse({ status: 200, description: 'Lease lifecycle data retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('lease-lifecycle')
	async getLeaseLifecycle(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = this.getuser_id(req)
		const data = await this.leaseAnalyticsService.getLeaseLifecycleData(user_id)

		return {
			success: true,
			data,
			message: 'Lease lifecycle data retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get lease status breakdown', description: 'Retrieve lease counts by status' })
	@ApiResponse({ status: 200, description: 'Lease status breakdown retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('lease-status-breakdown')
	async getLeaseStatusBreakdown(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = this.getuser_id(req)
		const data =
			await this.leaseAnalyticsService.getLeaseStatusBreakdown(user_id)

		return {
			success: true,
			data,
			message: 'Lease status breakdown retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get lease page data', description: 'Retrieve unified lease analytics page data' })
	@ApiResponse({ status: 200, description: 'Lease page data retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('lease/page-data')
	async getLeasePageData(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const user_id = this.getuser_id(req)
		const data =
			await this.leaseAnalyticsService.getLeaseAnalyticsPageData(user_id)

		return {
			success: true,
			data,
			message: 'Lease analytics page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
