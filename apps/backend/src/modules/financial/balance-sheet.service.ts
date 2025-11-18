import { Injectable, Logger } from '@nestjs/common'
import type { BalanceSheetData } from '@repo/shared/types/financial-statements'
import {
	createFinancialPeriod,
	safeNumber,
	validateBalanceSheet
} from '@repo/shared/utils/financial-statements'
import { SupabaseService } from '../../database/supabase.service'
import {
	calculatePropertyFinancials,
	loadLedgerData,
	parseDate,
	type ExpenseRow,
	type LedgerData,
	type RentPaymentRow
} from './financial-ledger.helpers'

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

		try {
			const ledger = await loadLedgerData(client)
			const asOf = new Date(asOfDate)
			const { overview, lease } = this.buildLedgerSnapshot(ledger, asOf)
			const noiBreakdown = this.buildNoiBreakdown(ledger, asOf)

			const totalNOI = noiBreakdown.reduce(
				(sum, prop) => sum + safeNumber(prop.noi),
				0
			)
			const assumedCapRate = 0.06 // 6% cap rate for property valuation
			const estimatedPropertyValue =
				totalNOI > 0 ? totalNOI / assumedCapRate : 0

			// ASSETS
			// Current Assets
			const cash = safeNumber(overview?.cash_balance)
			const accountsReceivable = safeNumber(
				lease?.total_outstanding_balance
			)
			const security_deposits = safeNumber(lease?.total_deposits)
			const currentAssetsTotal = cash + accountsReceivable + security_deposits

			// Fixed Assets
			const propertyValues = estimatedPropertyValue
			const accumulatedDepreciation = estimatedPropertyValue * 0.15 // Assume 15% depreciation
			const netPropertyValue = propertyValues - accumulatedDepreciation
			const fixedAssetsTotal = netPropertyValue

			const totalAssets = currentAssetsTotal + fixedAssetsTotal

			// LIABILITIES
			// Current Liabilities
			const accountsPayable = safeNumber(overview?.accounts_payable)
			const security_depositLiability = security_deposits // Equal to security deposits held
			const accruedExpenses = safeNumber(overview?.accrued_expenses)
			const currentLiabilitiesTotal =
				accountsPayable + security_depositLiability + accruedExpenses

			// Long-term Liabilities
			const mortgagesPayable = safeNumber(overview?.mortgages_payable)
			const longTermLiabilitiesTotal = mortgagesPayable

			const totalLiabilities = currentLiabilitiesTotal + longTermLiabilitiesTotal

			// EQUITY
			const ownerCapital = safeNumber(overview?.owner_capital)
			const retainedEarnings = safeNumber(overview?.retained_earnings)
			const currentPeriodIncome = safeNumber(overview?.current_period_income)
			const totalEquity = ownerCapital + retainedEarnings + currentPeriodIncome

			// Construct balance sheet
			const balanceSheet: BalanceSheetData = {
				period: createFinancialPeriod(asOfDate, asOfDate),
				assets: {
					currentAssets: {
						cash,
						accountsReceivable,
						security_deposits,
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
						security_depositLiability,
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
				balanceCheck: false
			}

			balanceSheet.balanceCheck = validateBalanceSheet(balanceSheet)

			return balanceSheet
		} catch (error) {
			this.logger.error('Failed to generate balance sheet snapshot', {
				error: error instanceof Error ? error.message : String(error),
				user_id: user.id,
				asOfDate
			})
			throw error instanceof Error
				? error
				: new Error('Unable to generate balance sheet')
		}
	}

	private buildLedgerSnapshot(ledger: LedgerData, asOf: Date) {
		const relevantPayments = ledger.rentPayments.filter(payment =>
			this.isOnOrBefore(payment.due_date, asOf)
		)
		const expenses = ledger.expenses.filter(expense =>
			this.isOnOrBefore(expense.expense_date ?? expense.created_at, asOf)
		)
		const deposits = this.sumSecurityDeposits(ledger.leases)
		const paidRent = relevantPayments
			.filter(payment => payment.status === 'PAID' || Boolean(payment.paid_date))
			.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)
		const outstandingRent = relevantPayments
			.filter(payment => payment.status !== 'PAID')
			.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)
		const totalExpenses = expenses.reduce(
			(sum, expense) => sum + (expense.amount ?? 0),
			0
		)
		const openMaintenance = ledger.maintenanceRequests
			.filter(request => request.status !== 'COMPLETED')
			.reduce((sum, request) => sum + (request.estimated_cost ?? 0), 0)
		const cash_balance = Math.max(paidRent - totalExpenses, 0)
		const current_period_income = this.calculateCurrentPeriodIncomeFromLedger(
			relevantPayments,
			expenses,
			asOf
		)

		return {
			overview: {
				cash_balance,
				accounts_payable: outstandingRent,
				accrued_expenses: openMaintenance,
				mortgages_payable: 0,
				owner_capital: deposits,
				retained_earnings: cash_balance - deposits,
				current_period_income
			} satisfies FinancialOverviewResponse,
			lease: {
				total_outstanding_balance: outstandingRent,
				total_deposits: deposits
			} satisfies LeaseSummaryResponse
		}
	}

	private buildNoiBreakdown(ledger: LedgerData, asOf: Date): NOIResponse[] {
		const rangeStart = this.subtractMonths(asOf, 12)
		const propertyFinancials = calculatePropertyFinancials(ledger, {
			start: rangeStart,
			end: asOf
		})
		return Array.from(propertyFinancials.revenue.entries()).map(
			([property_id, revenue]) => ({
				property_id,
				noi: revenue - (propertyFinancials.expenses.get(property_id) ?? 0)
			})
		)
	}

	private sumSecurityDeposits(leases: LedgerData['leases']): number {
		return leases.reduce(
			(sum, lease) => sum + (lease.security_deposit ?? 0),
			0
		)
	}

	private calculateCurrentPeriodIncomeFromLedger(
		payments: RentPaymentRow[],
		expenses: ExpenseRow[],
		asOf: Date
	): number {
		const { start, end } = this.getMonthBounds(asOf)
		const revenue = payments
			.filter(payment => this.isWithin(payment.due_date, start, end))
			.filter(payment => payment.status === 'PAID' || Boolean(payment.paid_date))
			.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)
		const periodExpenses = expenses
			.filter(expense =>
				this.isWithin(expense.expense_date ?? expense.created_at, start, end)
			)
			.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)

		return revenue - periodExpenses
	}

	private getMonthBounds(date: Date) {
		const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
		const end = new Date(
			Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999)
		)
		return { start, end }
	}

	private isOnOrBefore(
		value: string | null | undefined,
		target: Date
	): boolean {
		const parsed = parseDate(value)
		if (!parsed) {
		 return false
		}
		return parsed.getTime() <= target.getTime()
	}

	private isWithin(
		value: string | null | undefined,
		start: Date,
		end: Date
	): boolean {
		const parsed = parseDate(value)
		if (!parsed) {
			return false
		}
		return parsed.getTime() >= start.getTime() && parsed.getTime() <= end.getTime()
	}

	private subtractMonths(reference: Date, months: number) {
		const clone = new Date(reference.getTime())
		clone.setUTCMonth(clone.getUTCMonth() - months)
		return clone
	}
}
