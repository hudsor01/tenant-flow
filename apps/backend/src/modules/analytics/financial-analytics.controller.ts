import { Controller, Get, Request } from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { FinancialAnalyticsService } from './financial-analytics.service'

@ApiTags('Analytics')
@ApiBearerAuth('supabase-auth')
@Controller('analytics')
export class FinancialAnalyticsController {
	constructor(
		private readonly financialAnalyticsService: FinancialAnalyticsService
	) {}

	@ApiOperation({ summary: 'Get financial metrics', description: 'Retrieve aggregate financial metrics for the owner' })
	@ApiResponse({ status: 200, description: 'Financial metrics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('financial-metrics')
	async getFinancialMetrics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.financialAnalyticsService.getFinancialMetrics(userId)

		return {
			success: true,
			data,
			message: 'Financial metrics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get financial breakdown', description: 'Retrieve detailed financial breakdown by category' })
	@ApiResponse({ status: 200, description: 'Financial breakdown retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('financial-breakdown')
	async getFinancialBreakdown(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.financialAnalyticsService.getFinancialBreakdown(userId)

		return {
			success: true,
			data,
			message: 'Financial breakdown retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get net operating income', description: 'Retrieve net operating income (NOI) calculation' })
	@ApiResponse({ status: 200, description: 'NOI retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('net-operating-income')
	async getNetOperatingIncome(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.financialAnalyticsService.getNetOperatingIncome(userId)

		return {
			success: true,
			data,
			message: 'Net operating income retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get financial overview', description: 'Retrieve high-level financial overview' })
	@ApiResponse({ status: 200, description: 'Financial overview retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('financial-overview')
	async getFinancialOverview(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.financialAnalyticsService.getFinancialOverview(userId)

		return {
			success: true,
			data,
			message: 'Financial overview retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get billing insights', description: 'Retrieve billing insights and trends' })
	@ApiResponse({ status: 200, description: 'Billing insights retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('billing-insights')
	async getBillingInsights(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data = await this.financialAnalyticsService.getBillingInsights(userId)

		return {
			success: true,
			data,
			message: 'Billing insights retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get expense summary', description: 'Retrieve expense summary by category' })
	@ApiResponse({ status: 200, description: 'Expense summary retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('expense-summary')
	async getExpenseSummary(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data = await this.financialAnalyticsService.getExpenseSummary(userId)

		return {
			success: true,
			data,
			message: 'Expense summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get invoice statistics', description: 'Retrieve invoice statistics and status breakdown' })
	@ApiResponse({ status: 200, description: 'Invoice statistics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('invoice-statistics')
	async getInvoiceStatistics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.financialAnalyticsService.getInvoiceStatistics(userId)

		return {
			success: true,
			data,
			message: 'Invoice statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get monthly metrics', description: 'Retrieve monthly financial metrics time series' })
	@ApiResponse({ status: 200, description: 'Monthly metrics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('monthly-metrics')
	async getMonthlyMetrics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data = await this.financialAnalyticsService.getMonthlyMetrics(userId)

		return {
			success: true,
			data,
			message: 'Monthly metrics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get lease financial summary', description: 'Retrieve financial summary for all leases' })
	@ApiResponse({ status: 200, description: 'Lease financial summary retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('lease-financial-summary')
	async getLeaseFinancialSummary(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.financialAnalyticsService.getLeaseFinancialSummary(userId)

		return {
			success: true,
			data,
			message: 'Lease financial summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get lease financial analytics', description: 'Retrieve detailed financial analytics per lease' })
	@ApiResponse({ status: 200, description: 'Lease financial analytics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('lease-financial-analytics')
	async getLeaseFinancialAnalytics(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
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

	@ApiOperation({ summary: 'Get financial page data', description: 'Retrieve unified financial analytics page data' })
	@ApiResponse({ status: 200, description: 'Financial page data retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('financial/page-data')
	async getFinancialPageData(
		@Request() req: AuthenticatedRequest
	): Promise<ControllerApiResponse> {
		const userId = req.user.id
		const data =
			await this.financialAnalyticsService.getFinancialAnalyticsPageData(userId)

		return {
			success: true,
			data,
			message: 'Financial analytics page data retrieved successfully',
			timestamp: new Date()
		}
	}
}
