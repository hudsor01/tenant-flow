import { Injectable, Logger } from '@nestjs/common'
import { FinancialAnalyticsService } from '../../analytics/financial-analytics.service'

export interface FinancialPerformanceReportData {
	profitLoss: {
		totalRevenue: number
		totalExpenses: number
		netIncome: number
		profitMargin: number
	}
	netOperatingIncome: Array<{
		property: string
		noi: number
		revenue: number
		expenses: number
	}>
	expenseBreakdown: Array<{
		category: string
		amount: number
		percentage: number
	}>
	monthlyTrends: Array<{
		month: string
		revenue: number
		expenses: number
		netIncome: number
	}>
	period: {
		start_date: string
		end_date: string
	}
}

@Injectable()
export class FinancialPerformanceTemplate {
	private readonly logger = new Logger(FinancialPerformanceTemplate.name)

	constructor(private readonly financialService: FinancialAnalyticsService) {}

	async generateReportData(
		user_id: string,
		start_date: string,
		end_date: string
	): Promise<FinancialPerformanceReportData> {
		this.logger.log('Generating financial performance report data', {
			user_id,
			start_date,
			end_date
		})

		const [financialMetrics, noiData, expenseSummary, monthlyMetrics] =
			await Promise.all([
				this.financialService.getFinancialMetrics(user_id),
				this.financialService.getNetOperatingIncome(user_id),
				this.financialService.getExpenseSummary(user_id),
				this.financialService.getMonthlyMetrics(user_id)
			])

		const profitLoss = {
			totalRevenue: financialMetrics.totalRevenue || 0,
			totalExpenses: financialMetrics.totalExpenses || 0,
			netIncome: financialMetrics.netIncome || 0,
			profitMargin: financialMetrics.profitMargin || 0
		}

		const netOperatingIncome = Array.isArray(noiData)
			? noiData.map(prop => ({
					property: prop.propertyName || 'Unknown',
					noi: prop.noi || 0,
					revenue: prop.revenue || 0,
					expenses: prop.expenses || 0
				}))
			: []

		const expenseBreakdown = Array.isArray(expenseSummary?.categories)
			? expenseSummary.categories.map(cat => ({
					category: cat.category || 'Other',
					amount: cat.amount || 0,
					percentage: cat.percentage || 0
				}))
			: []

		const monthlyTrends = Array.isArray(monthlyMetrics)
			? monthlyMetrics.slice(-6).map(month => ({
					month: month.month || '',
					revenue: month.revenue || 0,
					expenses: month.expenses || 0,
					netIncome: month.netIncome || 0
				}))
			: []

		return {
			profitLoss,
			netOperatingIncome,
			expenseBreakdown,
			monthlyTrends,
			period: {
				start_date,
				end_date
			}
		}
	}

	formatForExcel(
		data: FinancialPerformanceReportData
	): Record<string, unknown>[] {
		const profitLossRows = [
			{
				sheet: 'Profit & Loss',
				metric: 'Total Revenue',
				amount: data.profitLoss.totalRevenue
			},
			{
				sheet: 'Profit & Loss',
				metric: 'Total Expenses',
				amount: data.profitLoss.totalExpenses
			},
			{
				sheet: 'Profit & Loss',
				metric: 'Net Income',
				amount: data.profitLoss.netIncome
			},
			{
				sheet: 'Profit & Loss',
				metric: 'Profit Margin',
				amount: `${data.profitLoss.profitMargin.toFixed(1)}%`
			}
		]

		const noiRows = data.netOperatingIncome.map(prop => ({
			sheet: 'NOI by Property',
			property: prop.property,
			revenue: prop.revenue,
			expenses: prop.expenses,
			noi: prop.noi
		}))

		const expenseRows = data.expenseBreakdown.map(cat => ({
			sheet: 'Expense Breakdown',
			category: cat.category,
			amount: cat.amount,
			percentage: `${cat.percentage.toFixed(1)}%`
		}))

		const trendRows = data.monthlyTrends.map(month => ({
			sheet: 'Monthly Trends',
			month: month.month,
			revenue: month.revenue,
			expenses: month.expenses,
			netIncome: month.netIncome
		}))

		return [...profitLossRows, ...noiRows, ...expenseRows, ...trendRows]
	}
}
