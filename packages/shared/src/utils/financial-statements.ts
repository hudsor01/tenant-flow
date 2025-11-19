/**
 * Financial Statements Utilities
 *
 * Helper functions for financial statement calculations and formatting
 */

import type {
	TaxDocumentsData
} from '../types/financial-statements.js'

/**
 * Safely converts a value to a number, returning 0 for invalid values
 */
export function safeNumber(value: unknown): number {
	if (value === null || value === undefined) return 0
	const num = Number(value)
	return Number.isFinite(num) ? num : 0
}

/**
 * Calculates percentage change between two values
 */
export function calculatePercentChange(
	current: number,
	previous: number
): number {
	if (previous === 0) return current === 0 ? 0 : 100
	return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Formats a date range into a human-readable label
 */
export function formatPeriodLabel(start_date: string, end_date: string): string {
	const start = new Date(start_date)
	const end = new Date(end_date)

	const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
	const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
	const year = end.getFullYear()

	if (startMonth === endMonth) {
		return `${startMonth} ${year}`
	}

	if (start.getFullYear() === end.getFullYear()) {
		return `${startMonth} - ${endMonth} ${year}`
	}

	return `${startMonth} ${start.getFullYear()} - ${endMonth} ${year}`
}

/**
 * Calculates profit margin percentage
 */
export function calculateProfitMargin(
	netIncome: number,
	totalRevenue: number
): number {
	if (totalRevenue === 0) return 0
	return (netIncome / totalRevenue) * 100
}

/**
 * Maps raw RPC data to Tax Documents structure
 */
export function mapToTaxDocuments(raw: unknown): Partial<TaxDocumentsData> {
	if (!raw || typeof raw !== 'object') {
		return {}
	}

	const data = raw as Record<string, unknown>

	return {
		taxYear: safeNumber(data.tax_year),
		incomeBreakdown: {
			grossRentalIncome: safeNumber(data.gross_rental_income),
			totalExpenses: safeNumber(data.total_expenses),
			netOperatingIncome: safeNumber(data.net_operating_income),
			depreciation: safeNumber(data.depreciation),
			mortgageInterest: safeNumber(data.mortgage_interest),
			taxableIncome: safeNumber(data.taxable_income)
		},
		totals: {
			totalIncome: safeNumber(data.total_income),
			totalDeductions: safeNumber(data.total_deductions),
			netTaxableIncome: safeNumber(data.net_taxable_income)
		}
	}
}

/**
 * Formats a currency value for display
 */
export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value)
}

/**
 * Formats a percentage value for display
 */
export function formatPercentage(value: number, decimals = 1): string {
	return `${value.toFixed(decimals)}%`
}


/**
 * Creates a financial period from start and end dates
 */
export function createFinancialPeriod(
	startDate: string,
	endDate: string
): { start_date: string; end_date: string; label: string } {
	return {
		start_date: startDate,
		end_date: endDate,
		label: formatPeriodLabel(startDate, endDate)
	}
}

/**
 * Validates balance sheet equation: Assets = Liabilities + Equity
 */
export function validateBalanceSheet(balanceSheet: {
	assets?: { totalAssets?: number }
	liabilities?: { totalLiabilities?: number }
	equity?: { totalEquity?: number }
}): boolean {
	const assets = balanceSheet.assets?.totalAssets ?? 0
	const liabilities = balanceSheet.liabilities?.totalLiabilities ?? 0
	const equity = balanceSheet.equity?.totalEquity ?? 0

	// Allow for small floating point rounding errors (within $1)
	const difference = Math.abs(assets - (liabilities + equity))
	return difference <= 1
}

/**
 * Calculates period comparison data
 */
export function calculatePeriodComparison(
	current: number,
	previous: number
): {
	current: number
	previous: number
	change: number
	changePercent: number
} {
	return {
		current,
		previous,
		change: current - previous,
		changePercent: calculatePercentChange(current, previous)
	}
}
