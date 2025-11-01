import { Injectable, Logger } from '@nestjs/common'
import type { IncomeStatementData } from '@repo/shared/types/financial-statements'
import {
	calculatePeriodComparison,
	calculateProfitMargin,
	createFinancialPeriod,
	safeNumber
} from '@repo/shared/utils/financial-statements'
import { SupabaseService } from '../../database/supabase.service'

interface FinancialMetricsResponse {
	total_revenue?: number
	operating_expenses?: number
	net_operating_income?: number
	cash_on_cash_return?: number
	cap_rate?: number
}

@Injectable()
export class IncomeStatementService {
	private readonly logger = new Logger(IncomeStatementService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Generate income statement for a given period
	 * Uses existing financial metrics RPC function
	 */
	async generateIncomeStatement(
		token: string,
		startDate: string,
		endDate: string
	): Promise<IncomeStatementData> {
		const client = this.supabaseService.getUserClient(token)

		this.logger.log(`Generating income statement (${startDate} to ${endDate})`)

		// Use existing calculate_financial_metrics RPC
		// RLS-protected RPC function automatically filters by authenticated user
		const { data: metrics, error } = await client.rpc(
			'calculate_financial_metrics',
			{
				p_start_date: startDate,
				p_end_date: endDate,
				p_user_id: ''
			}
		)

		if (error) {
			this.logger.error(`Failed to calculate metrics: ${error.message}`)
			throw error
		}

		// Get maintenance costs
		// Note: maintenance_request links to unit, which links to property
		// We need to join through unit to filter by property owner
		// RLS automatically filters maintenance requests by user's properties
		const { data: maintenanceData, error: maintenanceError } = await client
			.from('maintenance_request')
			.select(
				`
				estimatedCost,
				unit!inner(
					property!inner(
						id
					)
				)
			`
			)
			.gte('createdAt', startDate)
			.lte('createdAt', endDate)
			.eq('status', 'COMPLETED')

		if (maintenanceError) {
			this.logger.error(
				`Failed to get maintenance costs: ${maintenanceError.message}`
			)
		}

		const maintenanceCosts =
			maintenanceData?.reduce(
				(sum, req) => sum + (req.estimatedCost || 0),
				0
			) || 0

		// Calculate revenue components from metrics
		const metricsData = (
			Array.isArray(metrics) ? metrics[0] : metrics
		) as FinancialMetricsResponse
		const totalRevenue = safeNumber(metricsData?.total_revenue)
		const rentalIncome = totalRevenue * 0.95 // Estimate 95% from rent
		const lateFeesIncome = totalRevenue * 0.03 // Estimate 3% from late fees
		const otherIncome = totalRevenue * 0.02 // Estimate 2% from other

		// Calculate expense components
		const operatingExpenses = safeNumber(metricsData?.operating_expenses)
		const propertyManagement = operatingExpenses * 0.1 // Estimate 10% management
		const utilities = operatingExpenses * 0.15 // Estimate 15% utilities
		const insurance = operatingExpenses * 0.1 // Estimate 10% insurance
		const propertyTax = operatingExpenses * 0.2 // Estimate 20% property tax
		const mortgage = operatingExpenses * 0.3 // Estimate 30% mortgage
		const other =
			operatingExpenses -
			(propertyManagement +
				utilities +
				insurance +
				propertyTax +
				mortgage +
				maintenanceCosts)

		const totalExpenses = operatingExpenses + maintenanceCosts
		const grossProfit = totalRevenue - totalExpenses
		const operatingIncome = grossProfit // Same as gross profit for property management
		const netIncome = operatingIncome
		const profitMargin = calculateProfitMargin(netIncome, totalRevenue)

		// Calculate previous period comparison
		const previousPeriod = await this.calculatePreviousPeriod(
			token,
			startDate,
			endDate,
			netIncome
		)

		return {
			period: createFinancialPeriod(startDate, endDate),
			revenue: {
				rentalIncome,
				lateFeesIncome,
				otherIncome,
				totalRevenue
			},
			expenses: {
				propertyManagement,
				maintenance: maintenanceCosts,
				utilities,
				insurance,
				propertyTax,
				mortgage,
				other,
				totalExpenses
			},
			grossProfit,
			operatingIncome,
			netIncome,
			profitMargin,
			previousPeriod
		}
	}

	/**
	 * Calculate previous period net income for comparison
	 */
	private async calculatePreviousPeriod(
		token: string,
		startDate: string,
		endDate: string,
		currentNetIncome: number
	): Promise<{
		netIncome: number
		changePercent: number
		changeAmount: number
	}> {
		const start = new Date(startDate)
		const end = new Date(endDate)
		const periodLength = end.getTime() - start.getTime()

		// Calculate previous period dates
		const previousEnd = new Date(start.getTime() - 1)
		const previousStart = new Date(previousEnd.getTime() - periodLength)

		const previousStartStr = previousStart.toISOString().split('T')[0] as string
		const previousEndStr = previousEnd.toISOString().split('T')[0] as string

		try {
			const client = this.supabaseService.getUserClient(token)

			const { data: previousMetrics, error } = await client.rpc(
				'calculate_financial_metrics',
				{
					p_start_date: previousStartStr,
					p_end_date: previousEndStr,
					p_user_id: ''
				}
			)

			if (error || !previousMetrics) {
				this.logger.warn('Could not calculate previous period data')
				return {
					netIncome: 0,
					changePercent: 0,
					changeAmount: 0
				}
			}

			const previousData = (
				Array.isArray(previousMetrics) ? previousMetrics[0] : previousMetrics
			) as FinancialMetricsResponse
			const previousRevenue = safeNumber(previousData?.total_revenue)
			const previousExpenses = safeNumber(previousData?.operating_expenses)
			const previousNetIncome = previousRevenue - previousExpenses

			const comparison = calculatePeriodComparison(
				currentNetIncome,
				previousNetIncome
			)

			return {
				netIncome: previousNetIncome,
				changePercent: comparison.changePercent,
				changeAmount: comparison.changeAmount
			}
		} catch (error) {
			this.logger.error(
				`Error calculating previous period: ${error instanceof Error ? error.message : String(error)}`
			)
			return {
				netIncome: 0,
				changePercent: 0,
				changeAmount: 0
			}
		}
	}
}
