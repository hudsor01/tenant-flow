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
import { FinancialAnalyticsService } from './financial-analytics.service'

@Controller('analytics')
export class FinancialAnalyticsController {
	private readonly logger = new Logger(FinancialAnalyticsController.name)

	constructor(
		private readonly financialAnalyticsService: FinancialAnalyticsService,
		private readonly supabaseService: SupabaseService
	) {}

	private async getAuthenticatedUser(request: Request): Promise<AuthUser> {
		const user = await this.supabaseService.getUser(request)
		if (!user) {
			this.logger.warn('Financial analytics request missing authentication', {
				endpoint: request.path,
				method: request.method
			})
			throw new UnauthorizedException('Authentication required')
		}

		return user as unknown as AuthUser
	}

	@Get('financial-metrics')
	async getFinancialMetrics(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getFinancialMetrics(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Financial metrics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('financial-breakdown')
	async getFinancialBreakdown(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getFinancialBreakdown(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Financial breakdown retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('net-operating-income')
	async getNetOperatingIncome(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getNetOperatingIncome(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Net operating income retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('financial-overview')
	async getFinancialOverview(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getFinancialOverview(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Financial overview retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('billing-insights')
	async getBillingInsights(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getBillingInsights(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Billing insights retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('expense-summary')
	async getExpenseSummary(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getExpenseSummary(user.id)

		return {
			success: true,
			data,
			message: 'Expense summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('invoice-statistics')
	async getInvoiceStatistics(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getInvoiceStatistics(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Invoice statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('monthly-metrics')
	async getMonthlyMetrics(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getMonthlyMetrics(user.id)

		return {
			success: true,
			data,
			message: 'Monthly metrics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-financial-summary')
	async getLeaseFinancialSummary(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data = await this.financialAnalyticsService.getLeaseFinancialSummary(
			user.id
		)

		return {
			success: true,
			data,
			message: 'Lease financial summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-financial-analytics')
	async getLeaseFinancialAnalytics(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data =
			await this.financialAnalyticsService.getLeasesWithFinancialAnalytics(
				user.id
			)

		return {
			success: true,
			data,
			message: 'Lease financial analytics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('financial/page-data')
	async getFinancialPageData(
		@Req() request: Request
	): Promise<ControllerApiResponse> {
		const user = await this.getAuthenticatedUser(request)
		const data =
			await this.financialAnalyticsService.getFinancialAnalyticsPageData(
				user.id
			)

		return {
			success: true,
			data,
			message: 'Financial analytics page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
