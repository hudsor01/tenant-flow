import { Controller, Get } from '@nestjs/common'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import { user_id } from '../../shared/decorators/user.decorator'
import { FinancialAnalyticsService } from './financial-analytics.service'

@Controller('analytics')
export class FinancialAnalyticsController {
	constructor(
		private readonly financialAnalyticsService: FinancialAnalyticsService
	) {}

	@Get('financial-metrics')
	async getFinancialMetrics(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getFinancialMetrics(
			userId
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
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getFinancialBreakdown(
			userId
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
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getNetOperatingIncome(
			userId
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
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getFinancialOverview(
			userId
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
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getBillingInsights(
			userId
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
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getExpenseSummary(userId)

		return {
			success: true,
			data,
			message: 'Expense summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('invoice-statistics')
	async getInvoiceStatistics(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getInvoiceStatistics(
			userId
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
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getMonthlyMetrics(userId)

		return {
			success: true,
			data,
			message: 'Monthly metrics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('lease-financial-summary')
	async getLeaseFinancialSummary(
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data = await this.financialAnalyticsService.getLeaseFinancialSummary(
			userId
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
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data =
			await this.financialAnalyticsService.getLeasesWithFinancialAnalytics(
				userId
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
		@user_id() userId: string
	): Promise<ControllerApiResponse> {
		const data =
			await this.financialAnalyticsService.getFinancialAnalyticsPageData(
				userId
			)

		return {
			success: true,
			data,
			message: 'Financial analytics page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
