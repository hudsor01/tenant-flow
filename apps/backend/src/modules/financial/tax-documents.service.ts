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
import {
	calculatePropertyFinancials,
	isWithinRange,
	loadLedgerData,
	parseDate,
	type DateRange,
	type LedgerData
} from './financial-ledger.helpers'

@Injectable()
export class TaxDocumentsService {
	private readonly logger = new Logger(TaxDocumentsService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Generate tax documents for a given year
	 * Aggregates deductible expenses and depreciation for tax preparation
	 */
	async generateTaxDocuments(
		token: string,
		taxYear: number
	): Promise<TaxDocumentsData> {
		const client = this.supabaseService.getUserClient(token)

		const {
			data: { user },
			error: authError
		} = await this.supabaseService.getAdminClient().auth.getUser(token)

		if (authError || !user) {
			throw new Error('Failed to authenticate user from token')
		}

		this.logger.log(`Generating tax documents for tax year ${taxYear}`)

		const start_date = `${taxYear}-01-01`
		const end_date = `${taxYear}-12-31`
		const range: DateRange = {
			start: new Date(start_date),
			end: new Date(end_date)
		}

		try {
			const ledger = await loadLedgerData(client)
			const expenseCategories = this.buildExpenseCategories(ledger, range)
			const propertyDepreciation = this.buildPropertyDepreciation(
				ledger,
				range,
				taxYear
			)

			const rentPayments = ledger.rentPayments.filter(payment =>
				isWithinRange(payment.due_date, range)
			)
			const grossRentalIncome = rentPayments
				.filter(payment => payment.status === 'PAID' || Boolean(payment.paid_date))
				.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

			const totalExpenses = ledger.expenses
				.filter(expense => isWithinRange(expense.expense_date ?? expense.created_at, range))
				.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)

			const netOperatingIncome = grossRentalIncome - totalExpenses
			const totalDepreciation = propertyDepreciation.reduce(
				(sum, prop) => sum + prop.annualDepreciation,
				0
			)
			const mortgageInterest = totalExpenses * 0.3
			const taxableIncome =
				netOperatingIncome - totalDepreciation - mortgageInterest
			const totalDeductions = totalExpenses + totalDepreciation

			return {
				period: createFinancialPeriod(start_date, end_date),
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
		} catch (error) {
			this.logger.error('Failed to generate tax documents', {
				error: error instanceof Error ? error.message : String(error),
				user_id: user.id,
				taxYear
			})
			throw error instanceof Error
				? error
				: new Error('Failed to generate tax documents')
		}
	}

	private buildExpenseCategories(
		ledger: LedgerData,
		range: DateRange
	): TaxExpenseCategory[] {
		const maintenanceCosts = ledger.maintenanceRequests
			.filter(
				request =>
					request.status === 'COMPLETED' &&
					isWithinRange(request.completed_at ?? request.created_at, range)
			)
			.reduce(
				(sum, request) =>
					sum + (request.actual_cost ?? request.estimated_cost ?? 0),
				0
			)

		const expenseTotal = ledger.expenses
			.filter(expense =>
				isWithinRange(expense.expense_date ?? expense.created_at, range)
			)
			.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)

		const feesTotal = ledger.rentPayments
			.filter(payment => isWithinRange(payment.due_date, range))
			.reduce(
				(sum, payment) =>
					sum +
					(payment.late_fee_amount ?? 0) +
					(payment.application_fee_amount ?? 0),
				0
			)

		const operationsAmount = Math.max(expenseTotal - maintenanceCosts, 0)
		const totalTracked = maintenanceCosts + operationsAmount + feesTotal || 1

		const categories = [
			{ name: 'Maintenance', amount: maintenanceCosts },
			{ name: 'Operations', amount: operationsAmount },
			{ name: 'Fees', amount: feesTotal }
		]

		return categories.map(category => {
			const percentage = Number(
				((category.amount / totalTracked) * 100).toFixed(2)
			)
			const mapped: TaxExpenseCategory = {
				category: category.name,
				amount: safeNumber(category.amount),
				percentage,
				deductible: true
			}
			const notes = this.getTaxNotes(category.name)
			if (notes) {
				mapped.notes = notes
			}
			return mapped
		})
	}

	private buildPropertyDepreciation(
		ledger: LedgerData,
		range: DateRange,
		taxYear: number
	): TaxPropertyDepreciation[] {
		const financials = calculatePropertyFinancials(ledger, range)
		const propertyNames = new Map(
			ledger.properties.map(property => [property.id, property.name ?? 'Property'])
		)

		return Array.from(financials.revenue.entries()).map(
			([property_id, revenue]) => {
				const expense = financials.expenses.get(property_id) ?? 0
				const noi = revenue - expense
				const propertyValue = noi > 0 ? noi / 0.06 : 100000
				const annualDepreciation = propertyValue / 27.5
				const acquisitionYear = this.deriveAcquisitionYear(
					ledger,
					property_id,
					taxYear
				)
				const yearsOwned = Math.max(taxYear - acquisitionYear, 0)
				const accumulatedDepreciation = annualDepreciation * yearsOwned
				const remainingBasis = propertyValue - accumulatedDepreciation

				return {
					property_id,
					propertyName: propertyNames.get(property_id) ?? 'Property',
					propertyValue,
					annualDepreciation,
					accumulatedDepreciation,
					remainingBasis
				}
			}
		)
	}

	private deriveAcquisitionYear(
		ledger: LedgerData,
		propertyId: string,
		fallbackYear: number
	): number {
		const property = ledger.properties.find(item => item.id === propertyId)
		if (!property) {
			return fallbackYear
		}
		const created = parseDate(property.created_at)
		return created ? created.getUTCFullYear() : fallbackYear
	}

	/**
	 * Get tax notes for specific expense categories
	 */
	private getTaxNotes(category: string): string | undefined {
		const notes: Record<string, string> = {
			Maintenance: 'Fully deductible as ordinary business expense',
			Insurance: 'Fully deductible including property and liability insurance',
			'Property Tax': 'Fully deductible',
			Utilities: 'Deductible if paid by owner',
			'Property Management':
				'Fully deductible including management fees and commissions',
			Mortgage: 'Interest portion only is deductible',
			Other: 'Review with tax professional for deductibility'
		}

		return notes[category]
	}
}
