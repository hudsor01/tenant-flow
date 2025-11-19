import { Injectable, Logger } from '@nestjs/common'
import {
	calculatePeriodComparison,
	createFinancialPeriod
} from '@repo/shared/utils/financial-statements'
import { SupabaseService } from '../../database/supabase.service'
import {
	isWithinRange,
	loadLedgerData,
	parseDate,
	type DateRange,
	type LedgerData
} from './financial-ledger.helpers'

export interface CashFlowData {
	period: {
		start_date: string
		end_date: string
	}
	operatingActivities: {
		rentalPaymentsReceived: number
		operatingExpensesPaid: number
		maintenancePaid: number
		netOperatingCash: number
	}
	investingActivities: {
		propertyAcquisitions: number
		propertyImprovements: number
		netInvestingCash: number
	}
	financingActivities: {
		mortgagePayments: number
		loanProceeds: number
		ownerContributions: number
		ownerDistributions: number
		netFinancingCash: number
	}
	netCashFlow: number
	beginningCash: number
	endingCash: number
	previousPeriod?: {
		amount: number
		change: number
		percentageChange: number
	}
}

@Injectable()
export class CashFlowService {
	private readonly logger = new Logger(CashFlowService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Generate cash flow statement for a given period
	 * Uses direct Supabase queries aggregated within the service
	 */
	async generateCashFlowStatement(
		token: string,
		start_date: string,
		end_date: string,
		includePreviousPeriod = true
	): Promise<CashFlowData> {
		const client = this.supabaseService.getUserClient(token)

		const {
			data: { user },
			error: authError
		} = await this.supabaseService.getAdminClient().auth.getUser(token)

		if (authError || !user) {
			throw new Error('Failed to authenticate user from token')
		}

		this.logger.log(
			`Generating cash flow statement (${start_date} to ${end_date})`
		)

		try {
			const ledger = await loadLedgerData(client)
			const range: DateRange = {
				start: new Date(start_date),
				end: new Date(end_date)
			}
			const snapshot = this.buildCashFlowSnapshot(ledger, range)

			const cashFlow: CashFlowData = {
				period: createFinancialPeriod(start_date, end_date),
				operatingActivities: {
					rentalPaymentsReceived: snapshot.rentalPaymentsReceived,
					operatingExpensesPaid: snapshot.operatingExpensesPaid,
					maintenancePaid: snapshot.maintenancePaid,
					netOperatingCash: snapshot.netOperatingCash
				},
				investingActivities: {
					propertyAcquisitions: snapshot.propertyAcquisitions,
					propertyImprovements: snapshot.propertyImprovements,
					netInvestingCash: snapshot.netInvestingCash
				},
				financingActivities: {
					mortgagePayments: snapshot.mortgagePayments,
					loanProceeds: snapshot.loanProceeds,
					ownerContributions: snapshot.ownerContributions,
					ownerDistributions: snapshot.ownerDistributions,
					netFinancingCash: snapshot.netFinancingCash
				},
				netCashFlow: snapshot.netCashFlow,
				beginningCash: snapshot.beginningCash,
				endingCash: snapshot.endingCash
			}

			if (includePreviousPeriod) {
				cashFlow.previousPeriod = this.calculatePreviousPeriodFromLedger(
					ledger,
					range,
					snapshot.netCashFlow
				)
			}

			return cashFlow
		} catch (error) {
			this.logger.error('Failed to generate cash flow statement', {
				error: error instanceof Error ? error.message : String(error),
				user_id: user.id,
				start_date,
				end_date
			})
			throw error instanceof Error
				? error
				: new Error('Failed to generate cash flow statement')
		}
	}

	private buildCashFlowSnapshot(ledger: LedgerData, range: DateRange) {
		const payments = ledger.rentPayments.filter(payment =>
			isWithinRange(payment.due_date, range)
		)
		const expenses = ledger.expenses.filter(expense =>
			isWithinRange(expense.expense_date ?? expense.created_at, range)
		)
		const maintenance = ledger.maintenanceRequests.filter(request =>
			isWithinRange(request.completed_at ?? request.created_at, range)
		)

		const rentalPaymentsReceived = payments
			.filter(payment => payment.status === 'PAID' || Boolean(payment.paid_date))
			.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

		const operatingExpensesPaid = expenses.reduce(
			(sum, expense) => sum + (expense.amount ?? 0),
			0
		)

		const maintenancePaid = maintenance
			.filter(request => request.status === 'COMPLETED')
			.reduce(
				(sum, request) =>
					sum + (request.actual_cost ?? request.estimated_cost ?? 0),
				0
			)

		const improvementSpend = expenses
			.filter(expense => !expense.maintenance_request_id)
			.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)

		const propertyImprovements = improvementSpend * -1
		const propertyAcquisitions = 0
		const mortgagePayments = 0
		const ownerDistributions = 0
		const ownerContributions = 0
		const loanProceeds = 0

		const netOperatingCash =
			rentalPaymentsReceived - operatingExpensesPaid - maintenancePaid
		const netInvestingCash = propertyAcquisitions + propertyImprovements
		const netFinancingCash =
			loanProceeds + ownerContributions - mortgagePayments - ownerDistributions
		const netCashFlow =
			netOperatingCash + netInvestingCash + netFinancingCash

		const beginningCash = this.calculateBeginningCash(ledger, range.start)
		const endingCash = beginningCash + netCashFlow

		return {
			rentalPaymentsReceived,
			operatingExpensesPaid,
			maintenancePaid,
			propertyImprovements,
			propertyAcquisitions,
			mortgagePayments,
			ownerDistributions,
			ownerContributions,
			loanProceeds,
			netOperatingCash,
			netInvestingCash,
			netFinancingCash,
			netCashFlow,
			beginningCash,
			endingCash
		}
	}

	private calculateBeginningCash(ledger: LedgerData, start?: Date): number {
		if (!start) {
			return 0
		}

		const paymentsBefore = ledger.rentPayments
			.filter(payment => {
				const dueDate = parseDate(payment.due_date)
				return dueDate ? dueDate < start : false
			})
			.filter(payment => payment.status === 'PAID' || Boolean(payment.paid_date))
			.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

		const expensesBefore = ledger.expenses
			.filter(expense => {
				const timestamp = parseDate(expense.expense_date ?? expense.created_at)
				return timestamp ? timestamp < start : false
			})
			.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)

		return Math.max(paymentsBefore - expensesBefore, 0)
	}

	private calculatePreviousPeriodFromLedger(
		ledger: LedgerData,
		currentRange: DateRange,
		currentNetCashFlow: number
	) {
		if (!currentRange.start || !currentRange.end) {
			const comparison = calculatePeriodComparison(currentNetCashFlow, 0)
			return {
				amount: comparison.previous,
				change: comparison.change,
				percentageChange: comparison.changePercent
			}
		}

		const periodLength =
			currentRange.end.getTime() - currentRange.start.getTime()
		const previousEnd = new Date(currentRange.start.getTime() - 1)
		const previousStart = new Date(previousEnd.getTime() - periodLength)
		const snapshot = this.buildCashFlowSnapshot(ledger, {
			start: previousStart,
			end: previousEnd
		})

		const comparison = calculatePeriodComparison(
			currentNetCashFlow,
			snapshot.netCashFlow
		)
		return {
			amount: comparison.previous,
			change: comparison.change,
			percentageChange: comparison.changePercent
		}
	}
}
