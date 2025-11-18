import { Injectable, Logger } from '@nestjs/common'
import type { DashboardStats } from '@repo/shared/types/core'
import { DashboardAnalyticsService } from '../../analytics/dashboard-analytics.service'
import { FinancialAnalyticsService } from '../../analytics/financial-analytics.service'

export interface ExecutiveMonthlyReportData {
	summary: {
		totalRevenue: number
		totalExpenses: number
		netIncome: number
		occupancyRate: number
		propertyCount: number
		unitCount: number
	}
	trends: {
		revenueGrowth: number
		expenseChange: number
		occupancyChange: number
	}
	topPerformers: Array<{
		property: string
		revenue: number
		occupancy: number
	}>
	keyMetrics: DashboardStats
	period: {
		start_date: string
		end_date: string
	}
}

@Injectable()
export class ExecutiveMonthlyTemplate {
	private readonly logger = new Logger(ExecutiveMonthlyTemplate.name)

	constructor(
		private readonly dashboardService: DashboardAnalyticsService,
		private readonly financialService: FinancialAnalyticsService
	) {}

	async generateReportData(
		user_id: string,
		start_date: string,
		end_date: string
	): Promise<ExecutiveMonthlyReportData> {
		this.logger.log('Generating executive monthly report data', {
			user_id,
			start_date,
			end_date
		})

		const [dashboardStats, financialOverview, _monthlyMetrics] =
			await Promise.all([
				this.dashboardService.getDashboardStats(user_id),
				this.financialService.getFinancialOverview(user_id),
				this.financialService.getMonthlyMetrics(user_id)
			])

		const summary = {
			totalRevenue: financialOverview.overview?.totalRevenue || 0,
			totalExpenses: financialOverview.overview?.totalExpenses || 0,
			netIncome: financialOverview.overview?.netIncome || 0,
			occupancyRate: dashboardStats.units?.occupancyRate || 0,
			propertyCount: dashboardStats.properties?.total || 0,
			unitCount: dashboardStats.units?.total || 0
		}

		const trends = {
			revenueGrowth:
				financialOverview.highlights?.find(h => h.label === 'Revenue Growth')
					?.trend || 0,
			expenseChange:
				financialOverview.highlights?.find(h => h.label === 'Expense Change')
					?.trend || 0,
			occupancyChange: dashboardStats.units?.occupancyChange || 0
		}

		// Top performers would need to be fetched from property performance endpoint
		const topPerformers: Array<{
			property: string
			revenue: number
			occupancy: number
		}> = []

		return {
			summary,
			trends,
			topPerformers,
			keyMetrics: dashboardStats,
			period: {
				start_date,
				end_date
			}
		}
	}

	formatForPDF(data: ExecutiveMonthlyReportData): string {
		return `
EXECUTIVE MONTHLY REPORT
Period: ${data.period.start_date} to ${data.period.end_date}

EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Financial Performance
• Total Revenue: $${data.summary.totalRevenue.toLocaleString()}
• Total Expenses: $${data.summary.totalExpenses.toLocaleString()}
• Net Income: $${data.summary.netIncome.toLocaleString()}

Portfolio Overview
• Properties: ${data.summary.propertyCount}
• Total Units: ${data.summary.unitCount}
• Occupancy Rate: ${data.summary.occupancyRate.toFixed(1)}%

PERFORMANCE TRENDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Revenue Growth: ${data.trends.revenueGrowth >= 0 ? '+' : ''}${data.trends.revenueGrowth.toFixed(1)}%
• Expense Change: ${data.trends.expenseChange >= 0 ? '+' : ''}${data.trends.expenseChange.toFixed(1)}%
• Occupancy Change: ${data.trends.occupancyChange >= 0 ? '+' : ''}${data.trends.occupancyChange.toFixed(1)}%

TOP PERFORMING PROPERTIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.topPerformers
	.map(
		(prop, index) => `${index + 1}. ${prop.property}
   Revenue: $${prop.revenue.toLocaleString()}
   Occupancy: ${prop.occupancy.toFixed(1)}%`
	)
	.join('\n\n')}
		`.trim()
	}

	formatForExcel(data: ExecutiveMonthlyReportData): Record<string, unknown>[] {
		return [
			{
				section: 'Summary',
				metric: 'Total Revenue',
				value: data.summary.totalRevenue
			},
			{
				section: 'Summary',
				metric: 'Total Expenses',
				value: data.summary.totalExpenses
			},
			{
				section: 'Summary',
				metric: 'Net Income',
				value: data.summary.netIncome
			},
			{
				section: 'Summary',
				metric: 'Property Count',
				value: data.summary.propertyCount
			},
			{
				section: 'Summary',
				metric: 'Total Units',
				value: data.summary.unitCount
			},
			{
				section: 'Summary',
				metric: 'Occupancy Rate',
				value: `${data.summary.occupancyRate.toFixed(1)}%`
			},
			...data.topPerformers.map((prop, index) => ({
				section: 'Top Performers',
				rank: index + 1,
				property: prop.property,
				revenue: prop.revenue,
				occupancy: `${prop.occupancy.toFixed(1)}%`
			}))
		]
	}
}
