import { Injectable, Logger } from '@nestjs/common'
import { FinancialAnalyticsService } from '../../analytics/financial-analytics.service'

export interface TaxPreparationReportData {
	incomeSummary: {
		totalRentalIncome: number
		otherIncome: number
		totalIncome: number
	}
	expenseSummary: {
		deductibleExpenses: number
		nonDeductibleExpenses: number
		totalExpenses: number
	}
	expenseCategories: Array<{
		category: string
		amount: number
		deductible: boolean
		taxCode: string
	}>
	propertyDepreciation: Array<{
		property: string
		purchasePrice: number
		depreciationRate: number
		annualDepreciation: number
		accumulatedDepreciation: number
	}>
	netOperatingIncome: Array<{
		property: string
		revenue: number
		expenses: number
		noi: number
	}>
	taxYearSummary: {
		totalRentalIncome: number
		totalDeductions: number
		netRentalIncome: number
		estimatedTaxLiability: number
	}
	period: {
		taxYear: number
		start_date: string
		end_date: string
	}
}

@Injectable()
export class TaxPreparationTemplate {
	private readonly logger = new Logger(TaxPreparationTemplate.name)

	constructor(private readonly financialService: FinancialAnalyticsService) {}

	async generateReportData(
		user_id: string,
		start_date: string,
		end_date: string
	): Promise<TaxPreparationReportData> {
		this.logger.log('Generating tax preparation report data', {
			user_id,
			start_date,
			end_date
		})

		const [expenseSummary, noiData, financialMetrics] = await Promise.all([
			this.financialService.getExpenseSummary(user_id),
			this.financialService.getNetOperatingIncome(user_id),
			this.financialService.getFinancialMetrics(user_id)
		])

		const totalRentalIncome = financialMetrics.totalRevenue || 0
		const totalExpenses = financialMetrics.totalExpenses || 0

		const incomeSummary = {
			totalRentalIncome,
			otherIncome: 0,
			totalIncome: totalRentalIncome
		}

		const deductibleExpenses = totalExpenses * 0.85
		const nonDeductibleExpenses = totalExpenses * 0.15

		const expenseSummaryData = {
			deductibleExpenses,
			nonDeductibleExpenses,
			totalExpenses
		}

		const expenseCategories = (expenseSummary?.categories || []).map(cat => ({
			category: cat.category || 'Other',
			amount: cat.amount || 0,
			deductible: true,
			taxCode: this.getTaxCode(cat.category || '')
		}))

		const propertyDepreciation = Array.isArray(noiData)
			? noiData.map(prop => ({
					property: prop.propertyName || 'Unknown',
					purchasePrice: 200000,
					depreciationRate: 3.636,
					annualDepreciation: 7272,
					accumulatedDepreciation: 0
				}))
			: []

		const netOperatingIncome = Array.isArray(noiData)
			? noiData.map(prop => ({
					property: prop.propertyName || 'Unknown',
					revenue: prop.revenue || 0,
					expenses: prop.expenses || 0,
					noi: prop.noi || 0
				}))
			: []

		const netRentalIncome = totalRentalIncome - deductibleExpenses
		const taxYearSummary = {
			totalRentalIncome,
			totalDeductions: deductibleExpenses,
			netRentalIncome,
			estimatedTaxLiability: netRentalIncome * 0.22
		}

		const taxYear = new Date(end_date).getFullYear()

		return {
			incomeSummary,
			expenseSummary: expenseSummaryData,
			expenseCategories,
			propertyDepreciation,
			netOperatingIncome,
			taxYearSummary,
			period: {
				taxYear,
				start_date,
				end_date
			}
		}
	}

	private getTaxCode(category: string): string {
		const taxCodes: Record<string, string> = {
			Utilities: 'Schedule E - Line 17',
			Maintenance: 'Schedule E - Line 14',
			Insurance: 'Schedule E - Line 9',
			'Property Tax': 'Schedule E - Line 16',
			Management: 'Schedule E - Line 11',
			Repairs: 'Schedule E - Line 14',
			Advertising: 'Schedule E - Line 6',
			Legal: 'Schedule E - Line 11',
			Mortgage: 'Schedule E - Line 12'
		}

		return taxCodes[category] || 'Schedule E - Line 19 (Other)'
	}

	formatForExcel(data: TaxPreparationReportData): Record<string, unknown>[] {
		const incomeRows = [
			{
				sheet: 'Income Summary',
				category: 'Total Rental Income',
				amount: data.incomeSummary.totalRentalIncome,
				taxForm: 'Schedule E - Line 3'
			},
			{
				sheet: 'Income Summary',
				category: 'Other Income',
				amount: data.incomeSummary.otherIncome,
				taxForm: 'Schedule E - Line 4'
			},
			{
				sheet: 'Income Summary',
				category: 'Total Income',
				amount: data.incomeSummary.totalIncome,
				taxForm: 'Schedule E - Line 3'
			}
		]

		const expenseRows = data.expenseCategories.map(cat => ({
			sheet: 'Expense Deductions',
			category: cat.category,
			amount: cat.amount,
			deductible: cat.deductible ? 'Yes' : 'No',
			taxCode: cat.taxCode
		}))

		const depreciationRows = data.propertyDepreciation.map(prop => ({
			sheet: 'Property Depreciation',
			property: prop.property,
			purchasePrice: prop.purchasePrice,
			depreciationRate: `${prop.depreciationRate}%`,
			annualDepreciation: prop.annualDepreciation,
			accumulatedDepreciation: prop.accumulatedDepreciation,
			taxForm: 'Form 4562'
		}))

		const noiRows = data.netOperatingIncome.map(prop => ({
			sheet: 'Net Operating Income',
			property: prop.property,
			revenue: prop.revenue,
			expenses: prop.expenses,
			noi: prop.noi
		}))

		const summaryRows = [
			{
				sheet: 'Tax Year Summary',
				item: 'Total Rental Income',
				amount: data.taxYearSummary.totalRentalIncome
			},
			{
				sheet: 'Tax Year Summary',
				item: 'Total Deductions',
				amount: data.taxYearSummary.totalDeductions
			},
			{
				sheet: 'Tax Year Summary',
				item: 'Net Rental Income',
				amount: data.taxYearSummary.netRentalIncome
			},
			{
				sheet: 'Tax Year Summary',
				item: 'Estimated Tax Liability (22%)',
				amount: data.taxYearSummary.estimatedTaxLiability
			}
		]

		return [
			...incomeRows,
			...expenseRows,
			...depreciationRows,
			...noiRows,
			...summaryRows
		]
	}
}
