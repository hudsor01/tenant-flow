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
import { LeaseAnalyticsService } from './lease-analytics.service'

@Controller('analytics')
export class LeaseAnalyticsController {
	private readonly logger = new Logger(LeaseAnalyticsController.name)

	constructor(
		private readonly leaseAnalyticsService: LeaseAnalyticsService,
		private readonly supabaseService: SupabaseService
	) {}

	private async getAuthenticatedUser(request: Request): Promise<authUser> {
		const user = await this.supabaseService.getUser(request)
		if (!user) {
			this.logger.warn('Lease analytics request missing authentication', {
				endpoint: request.path,
				method: request.method
			})
			throw new UnauthorizedException('Authentication required')
		}

		return user as unknown as authUser
	}

	@Get('lease-analytics')
	async getLeaseAnalytics(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data =
			await this.leaseAnalyticsService.getLeasesWithFinancialAnalytics(user.id)

		return {
			success: true,
			data,
			message: 'Lease analytics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-summary')
	async getLeaseSummary(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.leaseAnalyticsService.getLeaseFinancialSummary(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Lease financial summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-lifecycle')
	async getLeaseLifecycle(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.leaseAnalyticsService.getLeaseLifecycleData(user.id)

		return {
			success: true,
			data,
			message: 'Lease lifecycle data retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-status-breakdown')
	async getLeaseStatusBreakdown(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.leaseAnalyticsService.getLeaseStatusBreakdown(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Lease status breakdown retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease/page-data')
	async getLeasePageData(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.leaseAnalyticsService.getLeaseAnalyticsPageData(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Lease analytics page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
