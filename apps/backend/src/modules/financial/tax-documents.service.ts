import { Injectable, Logger } from '@nestjs/common'
import type {
	TaxDocumentsData,
	TaxExpenseCategory,
	TaxPropertyDepreciation
} from '@repo/shared/types/financial-statements'
import {
	createFinancialPeriod,
	safeNumber
} from '@repo/shared/utils/financial-statements'
import { SupabaseService } from '../../database/supabase.service'

interface ExpenseSummaryResponse {
	category?: string
	amount?: number
	percentage?: number
}

interface NOIPropertyResponse {
	property_id?: string
	property_name?: string
	property_value?: number
	acquisition_year?: number
}

interface FinancialMetricsResponse {
	total_revenue?: number
	operating_expenses?: number
}

@Injectable()
export class TaxDocumentsService {
	private readonly logger = new Logger(TaxDocumentsService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Generate tax documents for a given year
	 * Aggregates deductible expenses and depreciation for tax preparation
	 */
	async generateTaxDocuments(
		userId: string,
		taxYear: number
	): Promise<TaxDocumentsData> {
		const client = this.supabaseService.getAdminClient()

		this.logger.log(
			`Generating tax documents for user ${userId} for tax year ${taxYear}`
		)

		// Calculate year date range
		const startDate = `${taxYear}-01-01`
		const endDate = `${taxYear}-12-31`

		// Get expense summary for deductible expenses
		const { data: expenseSummary, error: expenseError } = await client.rpc(
			'get_expense_summary',
			{
				p_user_id: userId
			}
		)

		if (expenseError) {
			this.logger.error(
				`Failed to get expense summary: ${expenseError.message}`
			)
			throw expenseError
		}

		// Get net operating income for property-level data
		const { data: noiData, error: noiError } = await client.rpc(
			'calculate_net_operating_income',
			{
				p_user_id: userId
			}
		)

		if (noiError) {
			this.logger.error(`Failed to calculate NOI: ${noiError.message}`)
			throw noiError
		}

		// Get financial metrics for income breakdown
		const { data: financialMetrics, error: metricsError } = await client.rpc(
			'calculate_financial_metrics',
			{
				p_user_id: userId,
				p_start_date: startDate,
				p_end_date: endDate
			}
		)

		if (metricsError) {
			this.logger.error(
				`Failed to get financial metrics: ${metricsError.message}`
			)
			throw metricsError
		}

		const expenseData = (
			Array.isArray(expenseSummary) ? expenseSummary : [expenseSummary]
		) as ExpenseSummaryResponse[]
		const metricsData = (
			Array.isArray(financialMetrics) ? financialMetrics[0] : financialMetrics
		) as FinancialMetricsResponse

		// Map expense categories to tax-deductible expenses
		const expenseCategories: TaxExpenseCategory[] = expenseData.map(expense => {
			const category = expense.category || 'Other'
			return {
				category,
				amount: safeNumber(expense.amount),
				percentage: safeNumber(expense.percentage),
				deductible: true, // Most property expenses are deductible
				notes: this.getTaxNotes(category)
			}
		})

		// Calculate property depreciation (27.5 years for residential)
		const propertyDepreciation: TaxPropertyDepreciation[] = Array.isArray(
			noiData
		)
			? (noiData as NOIPropertyResponse[]).map(property => {
					const propertyValue = safeNumber(property.property_value) || 100000 // Estimate if not available
					const annualDepreciation = propertyValue / 27.5 // Residential depreciation period
					const yearsOwned = taxYear - (property.acquisition_year || taxYear)
					const accumulatedDepreciation = annualDepreciation * yearsOwned
					const remainingBasis = propertyValue - accumulatedDepreciation

					return {
						propertyId: property.property_id || 'unknown',
						propertyName: property.property_name || 'Property',
						propertyValue,
						annualDepreciation,
						accumulatedDepreciation,
						remainingBasis
					}
				})
			: []

		// Calculate totals
		const grossRentalIncome = safeNumber(metricsData?.total_revenue)
		const totalExpenses = safeNumber(metricsData?.operating_expenses)
		const netOperatingIncome = grossRentalIncome - totalExpenses

		const totalDepreciation = propertyDepreciation.reduce(
			(sum, prop) => sum + prop.annualDepreciation,
			0
		)
		const mortgageInterest = totalExpenses * 0.3 // Estimate 30% of expenses are mortgage interest

		const taxableIncome =
			netOperatingIncome - totalDepreciation - mortgageInterest

		const totalDeductions = totalExpenses + totalDepreciation

		return {
			period: createFinancialPeriod(startDate, endDate),
			taxYear,
			incomeBreakdown: {
				grossRentalIncome,
				totalExpenses,
				netOperatingIncome,
				depreciation: totalDepreciation,
				mortgageInterest,
				taxableIncome
			},
			expenseCategories,
			propertyDepreciation,
			totals: {
				totalIncome: grossRentalIncome,
				totalDeductions,
				netTaxableIncome: taxableIncome
			},
			schedule: {
				scheduleE: {
					grossRentalIncome,
					totalExpenses,
					depreciation: totalDepreciation,
					netIncome: taxableIncome
				}
			}
		}
	}

	/**
	 * Get tax notes for specific expense categories
	 */
	private getTaxNotes(category: string): string | undefined {
		const notes: Record<string, string> = {
			Maintenance: 'Fully deductible as ordinary business expense',
			Insurance: 'Fully deductible including property and liability insurance',
			'Property Tax': 'Fully deductible',
			Utilities: 'Deductible if paid by landlord',
			'Property Management':
				'Fully deductible including management fees and commissions',
			Mortgage: 'Interest portion only is deductible',
			Other: 'Review with tax professional for deductibility'
		}

		return notes[category]
	}
}
