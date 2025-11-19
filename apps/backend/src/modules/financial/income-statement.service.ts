import { Injectable, Logger } from '@nestjs/common'
import type { IncomeStatementData } from '@repo/shared/types/financial-statements'
import {
	calculatePercentChange,
	calculateProfitMargin,
	createFinancialPeriod,
	safeNumber
} from '@repo/shared/utils/financial-statements'
import { SupabaseService } from '../../database/supabase.service'
import {
	isWithinRange,
	loadLedgerData,
	type DateRange,
	type LedgerData
} from './financial-ledger.helpers'

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
		start_date: string,
		end_date: string
	): Promise<IncomeStatementData> {
		const client = this.supabaseService.getUserClient(token)

		const {
			data: { user },
			error: authError
		} = await this.supabaseService.getAdminClient().auth.getUser(token)

		if (authError || !user) {
			throw new Error('Failed to authenticate user from token')
		}

		this.logger.log(`Generating income statement (${start_date} to ${end_date})`)

		try {
			const ledger = await loadLedgerData(client)
			const range: DateRange = {
				start: new Date(start_date),
				end: new Date(end_date)
			}
			const summary = this.summarizeIncome(ledger, range)

			const totalRevenue = safeNumber(summary.totalRevenue)
			const rentalIncome = totalRevenue * 0.95 // Estimate 95% from rent
			const lateFeesIncome = totalRevenue * 0.03 // Estimate 3% from late fees
			const otherIncome = totalRevenue * 0.02 // Estimate 2% from other

			const operatingExpenses = safeNumber(summary.operatingExpenses)
			const maintenanceCosts = safeNumber(summary.maintenanceCosts)
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
			const operatingIncome = grossProfit
			const netIncome = operatingIncome
			const profitMargin = calculateProfitMargin(netIncome, totalRevenue)

			const previousPeriod = this.calculatePreviousPeriod(
				ledger,
				start_date,
				end_date,
				netIncome
			)

			return {
				period: createFinancialPeriod(start_date, end_date),
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
		} catch (error) {
			this.logger.error('Failed to generate income statement', {
				error: error instanceof Error ? error.message : String(error),
				user_id: user.id,
				start_date,
				end_date
			})
			throw error instanceof Error
				? error
				: new Error('Failed to generate income statement')
		}
	}

	private summarizeIncome(ledger: LedgerData, range: DateRange) {
		const payments = ledger.rentPayments.filter(payment =>
			isWithinRange(payment.due_date, range)
		)
		const expenses = ledger.expenses.filter(expense =>
			isWithinRange(expense.expense_date ?? expense.created_at, range)
		)
		const maintenance = ledger.maintenanceRequests.filter(request =>
			request.status === 'COMPLETED' &&
			isWithinRange(request.completed_at ?? request.created_at, range)
		)

		const totalRevenue = payments
			.filter(
				payment => payment.status === 'PAID' || Boolean(payment.paid_date)
			)
			.reduce(
				(sum, payment) =>
					sum +
					safeNumber(payment.amount) +
					safeNumber(payment.late_fee_amount) +
					safeNumber(payment.application_fee_amount),
				0
			)

		const operatingExpenses = expenses.reduce(
			(sum, expense) => sum + safeNumber(expense.amount),
			0
		)

		const maintenanceCosts = maintenance.reduce(
			(sum, request) =>
				sum + safeNumber(request.actual_cost ?? request.estimated_cost),
			0
		)

		return { totalRevenue, operatingExpenses, maintenanceCosts }
	}

	private calculatePreviousPeriod(
		ledger: LedgerData,
		start_date: string,
		end_date: string,
		currentNetIncome: number
	) {
		const start = new Date(start_date)
		const end = new Date(end_date)
		const periodLength = end.getTime() - start.getTime()
		const previousEnd = new Date(start.getTime() - 1)
		const previousStart = new Date(previousEnd.getTime() - periodLength)
		const summary = this.summarizeIncome(ledger, {
			start: previousStart,
			end: previousEnd
		})

		const previousNetIncome =
			safeNumber(summary.totalRevenue) -
			(safeNumber(summary.operatingExpenses) +
				safeNumber(summary.maintenanceCosts))

		return {
			netIncome: previousNetIncome,
			change: currentNetIncome - previousNetIncome,
			changePercent: calculatePercentChange(currentNetIncome, previousNetIncome)
		}
	}
}
