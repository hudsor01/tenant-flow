import { Injectable, Logger } from '@nestjs/common'
import type { BalanceSheetData } from '@repo/shared/types/financial-statements'
import {
	createFinancialPeriod,
	safeNumber,
	validateBalanceSheet
} from '@repo/shared/utils/financial-statements'
import { SupabaseService } from '../../database/supabase.service'

interface FinancialOverviewResponse {
	cash_balance?: number
	accounts_payable?: number
	accrued_expenses?: number
	mortgages_payable?: number
	owner_capital?: number
	retained_earnings?: number
	current_period_income?: number
}

interface LeaseSummaryResponse {
	total_outstanding_balance?: number
	total_deposits?: number
}

interface NOIResponse {
	noi?: number
	property_id?: string
}

@Injectable()
export class BalanceSheetService {
	private readonly logger = new Logger(BalanceSheetService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Generate balance sheet for a given date
	 * Aggregates assets, liabilities, and equity
	 */
	async generateBalanceSheet(
		token: string,
		asOfDate: string
	): Promise<BalanceSheetData> {
		const client = this.supabaseService.getUserClient(token)

		// Get user ID from token
		const {
			data: { user },
			error: authError
		} = await this.supabaseService.getAdminClient().auth.getUser(token)

		if (authError || !user) {
			throw new Error('Failed to authenticate user from token')
		}

		this.logger.log(`Generating balance sheet as of ${asOfDate}`)

		// Get financial overview for balance sheet data
		// RLS-protected RPC function automatically filters by authenticated user
		const { data: financialOverview, error: overviewError } = await client.rpc(
			'get_financial_overview',
			{ p_user_id: user.id }
		)

		if (overviewError) {
			this.logger.error(
				`Failed to get financial overview: ${overviewError.message}`
			)
			throw overviewError
		}

		// Get net operating income for property values
		// RLS-protected RPC function with explicit user ID for defense-in-depth
		const { data: noiData, error: noiError } = await client.rpc(
			'calculate_net_operating_income',
			{
				p_user_id: user.id
			}
		)

		if (noiError) {
			this.logger.error(`Failed to calculate NOI: ${noiError.message}`)
			throw noiError
		}

		// Get lease financial summary for receivables
		// RLS-protected RPC function with explicit user ID for defense-in-depth
		const { data: leaseSummary, error: leaseError } = await client.rpc(
			'get_lease_financial_summary',
			{
				p_user_id: user.id
			}
		)

		if (leaseError) {
			this.logger.error(`Failed to get lease summary: ${leaseError.message}`)
			throw leaseError
		}

		const overviewData = (
			Array.isArray(financialOverview)
				? financialOverview[0]
				: financialOverview
		) as FinancialOverviewResponse
		const leaseData = (
			Array.isArray(leaseSummary) ? leaseSummary[0] : leaseSummary
		) as LeaseSummaryResponse

		// Calculate property values from NOI (using cap rate assumption)
		const totalNOI = Array.isArray(noiData)
			? (noiData as NOIResponse[]).reduce(
					(sum, prop) => sum + safeNumber(prop.noi),
					0
				)
			: 0
		const assumedCapRate = 0.06 // 6% cap rate for property valuation
		const estimatedPropertyValue = totalNOI > 0 ? totalNOI / assumedCapRate : 0

		// ASSETS
		// Current Assets
		const cash = safeNumber(overviewData?.cash_balance)
		const accountsReceivable = safeNumber(leaseData?.total_outstanding_balance)
		const securityDeposits = safeNumber(leaseData?.total_deposits)
		const currentAssetsTotal = cash + accountsReceivable + securityDeposits

		// Fixed Assets
		const propertyValues = estimatedPropertyValue
		const accumulatedDepreciation = estimatedPropertyValue * 0.15 // Assume 15% depreciation
		const netPropertyValue = propertyValues - accumulatedDepreciation
		const fixedAssetsTotal = netPropertyValue

		const totalAssets = currentAssetsTotal + fixedAssetsTotal

		// LIABILITIES
		// Current Liabilities
		const accountsPayable = safeNumber(overviewData?.accounts_payable)
		const securityDepositLiability = securityDeposits // Equal to security deposits held
		const accruedExpenses = safeNumber(overviewData?.accrued_expenses)
		const currentLiabilitiesTotal =
			accountsPayable + securityDepositLiability + accruedExpenses

		// Long-term Liabilities
		const mortgagesPayable = safeNumber(overviewData?.mortgages_payable)
		const longTermLiabilitiesTotal = mortgagesPayable

		const totalLiabilities = currentLiabilitiesTotal + longTermLiabilitiesTotal

		// EQUITY
		const ownerCapital = safeNumber(overviewData?.owner_capital)
		const retainedEarnings = safeNumber(overviewData?.retained_earnings)
		const currentPeriodIncome = safeNumber(overviewData?.current_period_income)
		const totalEquity = ownerCapital + retainedEarnings + currentPeriodIncome

		// Construct balance sheet
		const balanceSheet: BalanceSheetData = {
			period: createFinancialPeriod(asOfDate, asOfDate),
			assets: {
				currentAssets: {
					cash,
					accountsReceivable,
					securityDeposits,
					total: currentAssetsTotal
				},
				fixedAssets: {
					propertyValues,
					accumulatedDepreciation,
					netPropertyValue,
					total: fixedAssetsTotal
				},
				totalAssets
			},
			liabilities: {
				currentLiabilities: {
					accountsPayable,
					securityDepositLiability,
					accruedExpenses,
					total: currentLiabilitiesTotal
				},
				longTermLiabilities: {
					mortgagesPayable,
					total: longTermLiabilitiesTotal
				},
				totalLiabilities
			},
			equity: {
				ownerCapital,
				retainedEarnings,
				currentPeriodIncome,
				totalEquity
			},
			balanceCheck: validateBalanceSheet({
				assets: {
					currentAssets: {
						cash,
						accountsReceivable,
						securityDeposits,
						total: currentAssetsTotal
					},
					fixedAssets: {
						propertyValues,
						accumulatedDepreciation,
						netPropertyValue,
						total: fixedAssetsTotal
					},
					totalAssets
				},
				liabilities: {
					currentLiabilities: {
						accountsPayable,
						securityDepositLiability,
						accruedExpenses,
						total: currentLiabilitiesTotal
					},
					longTermLiabilities: {
						mortgagesPayable,
						total: longTermLiabilitiesTotal
					},
					totalLiabilities
				},
				equity: {
					ownerCapital,
					retainedEarnings,
					currentPeriodIncome,
					totalEquity
				},
				period: createFinancialPeriod(asOfDate, asOfDate),
				balanceCheck: true
			})
		}

		// Log if balance sheet doesn't balance
		if (!balanceSheet.balanceCheck) {
			this.logger.warn(
				`Balance sheet does not balance: Assets=${totalAssets}, Liabilities+Equity=${totalLiabilities + totalEquity}`
			)
		}

		return balanceSheet
	}
}
