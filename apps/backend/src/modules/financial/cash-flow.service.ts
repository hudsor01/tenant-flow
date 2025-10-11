import { Injectable, Logger } from '@nestjs/common'
import type { CashFlowData } from '@repo/shared/types/financial-statements'
import {
	calculatePeriodComparison,
	createFinancialPeriod,
	safeNumber
} from '@repo/shared/utils/financial-statements'
import { SupabaseService } from '../../database/supabase.service'

interface MonthlyMetricsResponse {
	operating_expenses?: number
	maintenance_costs?: number
	property_improvements?: number
	mortgage_payments?: number
	owner_distributions?: number
	beginning_cash?: number
}

interface BillingInsightsResponse {
	total_collected?: number
}

@Injectable()
export class CashFlowService {
	private readonly logger = new Logger(CashFlowService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Generate cash flow statement for a given period
	 * Orchestrates data from monthly metrics and billing insights
	 */
	async generateCashFlowStatement(
		userId: string,
		startDate: string,
		endDate: string,
		// When false, do not calculate the previous period to avoid recursive calls
		includePreviousPeriod = true
	): Promise<CashFlowData> {
		const client = this.supabaseService.getAdminClient()

		this.logger.log(
			`Generating cash flow statement for user ${userId} (${startDate} to ${endDate})`
		)

		// Get monthly metrics for cash flow patterns
		const { data: monthlyMetrics, error: monthlyError } = await client.rpc(
			'calculate_monthly_metrics',
			{
				p_user_id: userId
			}
		)

		if (monthlyError) {
			this.logger.error(
				`Failed to calculate monthly metrics: ${monthlyError.message}`
			)
			throw monthlyError
		}

		// Get billing insights for collections
		const { data: billingInsights, error: billingError } = await client.rpc(
			'get_billing_insights',
			{
				user_id: userId
			}
		)

		if (billingError) {
			this.logger.error(
				`Failed to get billing insights: ${billingError.message}`
			)
			throw billingError
		}

		// Get invoice statistics for accounts receivable changes
		const { data: _invoiceStats, error: invoiceError } = await client.rpc(
			'get_invoice_statistics',
			{
				p_user_id: userId
			}
		)

		if (invoiceError) {
			this.logger.error(
				`Failed to get invoice statistics: ${invoiceError.message}`
			)
		}

		// Extract and calculate cash flow components
		const monthlyData = (
			Array.isArray(monthlyMetrics) ? monthlyMetrics[0] : monthlyMetrics
		) as MonthlyMetricsResponse
		const billingData = (
			Array.isArray(billingInsights) ? billingInsights[0] : billingInsights
		) as BillingInsightsResponse

		// Operating Activities
		const rentalPaymentsReceived = safeNumber(billingData?.total_collected)
		const operatingExpensesPaid = safeNumber(monthlyData?.operating_expenses)
		const maintenancePaid = safeNumber(monthlyData?.maintenance_costs)
		const netOperatingCash =
			rentalPaymentsReceived - operatingExpensesPaid - maintenancePaid

		// Investing Activities (typically 0 for most periods)
		const propertyAcquisitions = 0
		const propertyImprovements = safeNumber(monthlyData?.property_improvements)
		const netInvestingCash = propertyAcquisitions + propertyImprovements

		// Financing Activities
		const mortgagePayments = safeNumber(monthlyData?.mortgage_payments)
		const loanProceeds = 0
		const ownerContributions = 0
		const ownerDistributions = safeNumber(monthlyData?.owner_distributions)
		const netFinancingCash =
			loanProceeds + ownerContributions - mortgagePayments - ownerDistributions

		const netCashFlow = netOperatingCash + netInvestingCash + netFinancingCash
		const beginningCash = safeNumber(monthlyData?.beginning_cash)
		const endingCash = beginningCash + netCashFlow

		// Calculate previous period comparison (optional)
		const previousPeriod = includePreviousPeriod
			? await this.calculatePreviousPeriod(
					userId,
					startDate,
					endDate,
					netCashFlow
				)
			: undefined

		return {
			period: createFinancialPeriod(startDate, endDate),
			operatingActivities: {
				rentalPaymentsReceived,
				operatingExpensesPaid,
				maintenancePaid,
				netOperatingCash
			},
			investingActivities: {
				propertyAcquisitions,
				propertyImprovements,
				netInvestingCash
			},
			financingActivities: {
				mortgagePayments,
				loanProceeds,
				ownerContributions,
				ownerDistributions,
				netFinancingCash
			},
			netCashFlow,
			beginningCash,
			endingCash,
			previousPeriod
		}
	}

	/**
	 * Calculate previous period net cash flow for comparison
	 */
	private async calculatePreviousPeriod(
		userId: string,
		startDate: string,
		endDate: string,
		currentNetCashFlow: number
	) {
		const start = new Date(startDate)
		const end = new Date(endDate)
		const periodLength = end.getTime() - start.getTime()

		// Calculate previous period dates
		const previousEnd = new Date(start.getTime() - 1)
		const previousStart = new Date(previousEnd.getTime() - periodLength)

		const previousStartStr = previousStart.toISOString().split('T')[0] as string
		const previousEndStr = previousEnd.toISOString().split('T')[0] as string

		try {
			const previousData = await this.generateCashFlowStatement(
				userId,
				previousStartStr,
				previousEndStr,
				// do not include previousPeriod for the previous period (avoid recursion)
				false
			)

			return calculatePeriodComparison(
				currentNetCashFlow,
				previousData.netCashFlow
			)
		} catch (error) {
			this.logger.warn(
				`Could not calculate previous period data: ${error instanceof Error ? error.message : String(error)}`
			)
			return undefined
		}
	}
}
