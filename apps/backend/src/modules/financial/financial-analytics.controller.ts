import {
	Controller,
	Get,
	Logger,
	Query,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import type { Request } from 'express'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import { SupabaseService } from '../../database/supabase.service'
import { FinancialService } from './financial.service'

/**
 * Public financial analytics endpoints (used by Next.js dashboard pages).
 *
 * These mirror the optimized financial calculations already implemented in
 * FinancialService but expose them under /financial/analytics so the frontend
 * hooks and UI components can consume live data again.
 */
@Controller('financial/analytics')
export class FinancialAnalyticsPublicController {
	private readonly logger = new Logger(FinancialAnalyticsPublicController.name)

	constructor(
		private readonly financialService: FinancialService,
		private readonly supabase: SupabaseService
	) {}

	private getToken(req: Request): string {
		const token = this.supabase.getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('Missing auth token for financial analytics request', {
				path: req.path
			})
			throw new UnauthorizedException('Authentication token required')
		}
		return token
	}

	@Get('revenue-trends')
	async getRevenueTrends(
		@Req() req: Request,
		@Query('year') year?: string
	): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const targetYear = Number.parseInt(year ?? '', 10) || new Date().getFullYear()
		const data = await this.financialService.getRevenueTrends(token, targetYear)

		return {
			success: true,
			data,
			message: 'Revenue trends retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('expense-breakdown')
	async getExpenseBreakdown(
		@Req() req: Request,
		@Query('year') year?: string
	): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const targetYear = Number.parseInt(year ?? '', 10) || new Date().getFullYear()
		const data = await this.financialService.getExpenseBreakdown(
			token,
			targetYear
		)

		return {
			success: true,
			data,
			message: 'Expense breakdown retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('dashboard-metrics')
	async getDashboardMetrics(
		@Req() req: Request,
		@Query('year') year?: string
	): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const targetYear = Number.parseInt(year ?? '', 10) || new Date().getFullYear()

		const [trends, overview, noi] = await Promise.all([
			this.financialService.getRevenueTrends(token, targetYear),
			this.financialService.getOverview(token, targetYear),
			this.financialService.getNetOperatingIncome(token)
		])

		const totalRevenue = trends.reduce((sum, m) => sum + (m.revenue ?? 0), 0)
		const totalExpenses = trends.reduce((sum, m) => sum + (m.expenses ?? 0), 0)
		const netIncome = totalRevenue - totalExpenses

		type OverviewShape = {
			properties?: { total?: number }
			summary?: { occupancyRate?: number }
		}

		const o = (overview as OverviewShape | undefined) ?? {}
		const propertyCountCandidate = o.properties?.total

		const propertyCount =
			typeof propertyCountCandidate === 'number'
				? propertyCountCandidate
				: ((await this.supabase.getUserClient(token).from('properties').select('id')).data?.length ?? 0)

		const occupancyRateCandidate = o.summary?.occupancyRate
		const occupancyRate =
			typeof occupancyRateCandidate === 'number' ? occupancyRateCandidate : 0

		const roiValues = (noi ?? [])
			.filter(item => typeof item.roi === 'number')
			.map(item => item.roi as number)
		const avgRoi = roiValues.length
			? Math.round(roiValues.reduce((sum, value) => sum + value, 0) / roiValues.length)
			: 0

		return {
			success: true,
			data: {
				totalRevenue,
				totalExpenses,
				netIncome,
				propertyCount,
				occupancyRate,
				avgRoi
			},
			message: 'Dashboard financial metrics retrieved successfully',
			timestamp: new Date()
		}
	}
}
