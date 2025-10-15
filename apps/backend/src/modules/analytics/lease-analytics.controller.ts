import { Controller, Get, Request, UnauthorizedException } from '@nestjs/common'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeaseAnalyticsService } from './lease-analytics.service'

@Controller('analytics')
export class LeaseAnalyticsController {
	constructor(private readonly leaseAnalyticsService: LeaseAnalyticsService) {}

	private getUserId(req: AuthenticatedRequest): string {
		const userId = req.user?.id
		if (!userId) {
			throw new UnauthorizedException('Authentication required')
		}
		return userId
	}

	@Get('lease-analytics')
	async getLeaseAnalytics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = this.getUserId(req)
		const data =
			await this.leaseAnalyticsService.getLeasesWithFinancialAnalytics(userId)

		return {
			success: true,
			data,
			message: 'Lease analytics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-summary')
	async getLeaseSummary(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = this.getUserId(req)
		const data =
			await this.leaseAnalyticsService.getLeaseFinancialSummary(userId)

		return {
			success: true,
			data,
			message: 'Lease financial summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-lifecycle')
	async getLeaseLifecycle(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = this.getUserId(req)
		const data = await this.leaseAnalyticsService.getLeaseLifecycleData(userId)

		return {
			success: true,
			data,
			message: 'Lease lifecycle data retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-status-breakdown')
	async getLeaseStatusBreakdown(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = this.getUserId(req)
		const data =
			await this.leaseAnalyticsService.getLeaseStatusBreakdown(userId)

		return {
			success: true,
			data,
			message: 'Lease status breakdown retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease/page-data')
	async getLeasePageData(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = this.getUserId(req)
		const data =
			await this.leaseAnalyticsService.getLeaseAnalyticsPageData(userId)

		return {
			success: true,
			data,
			message: 'Lease analytics page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
