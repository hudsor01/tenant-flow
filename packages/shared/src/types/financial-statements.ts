/**
 * Financial Statements Types
 *
 * Type definitions for standardized financial statements:
 * - Income Statement (P&L)
 * - Cash Flow Statement
 * - Balance Sheet
 * - Tax Documents
 */

/**
 * Common period information for all financial statements
 */
export interface FinancialPeriod {
	startDate: string
	endDate: string
	label: string
}

/**
 * Month-over-month comparison data
 */
export interface PeriodComparison {
	currentValue: number
	previousValue: number
	changeAmount: number
	changePercent: number
}

// ============================================
// INCOME STATEMENT TYPES
// ============================================

export interface IncomeStatementRevenue {
	rentalIncome: number
	lateFeesIncome: number
	otherIncome: number
	totalRevenue: number
}

export interface IncomeStatementExpenses {
	propertyManagement: number
	maintenance: number
	utilities: number
	insurance: number
	propertyTax: number
	mortgage: number
	other: number
	totalExpenses: number
}

export interface IncomeStatementData {
	period: FinancialPeriod
	revenue: IncomeStatementRevenue
	expenses: IncomeStatementExpenses
	grossProfit: number
	operatingIncome: number
	netIncome: number
	profitMargin: number
	previousPeriod?: {
		netIncome: number
		changePercent: number
		changeAmount: number
	}
}

// ============================================
// CASH FLOW STATEMENT TYPES
// ============================================

export interface CashFlowOperatingActivities {
	rentalPaymentsReceived: number
	operatingExpensesPaid: number
	maintenancePaid: number
	netOperatingCash: number
}

export interface CashFlowInvestingActivities {
	propertyAcquisitions: number
	propertyImprovements: number
	netInvestingCash: number
}

export interface CashFlowFinancingActivities {
	mortgagePayments: number
	loanProceeds: number
	ownerContributions: number
	ownerDistributions: number
	netFinancingCash: number
}

export interface CashFlowData {
	period: FinancialPeriod
	operatingActivities: CashFlowOperatingActivities
	investingActivities: CashFlowInvestingActivities
	financingActivities: CashFlowFinancingActivities
	netCashFlow: number
	beginningCash: number
	endingCash: number
	previousPeriod?: PeriodComparison
}

// ============================================
// BALANCE SHEET TYPES
// ============================================

export interface BalanceSheetAssets {
	currentAssets: {
		cash: number
		accountsReceivable: number
		securityDeposits: number
		total: number
	}
	fixedAssets: {
		propertyValues: number
		accumulatedDepreciation: number
		netPropertyValue: number
		total: number
	}
	totalAssets: number
}

export interface BalanceSheetLiabilities {
	currentLiabilities: {
		accountsPayable: number
		securityDepositLiability: number
		accruedExpenses: number
		total: number
	}
	longTermLiabilities: {
		mortgagesPayable: number
		total: number
	}
	totalLiabilities: number
}

export interface BalanceSheetEquity {
	ownerCapital: number
	retainedEarnings: number
	currentPeriodIncome: number
	totalEquity: number
}

export interface BalanceSheetData {
	period: FinancialPeriod
	assets: BalanceSheetAssets
	liabilities: BalanceSheetLiabilities
	equity: BalanceSheetEquity
	balanceCheck: boolean // Assets should equal Liabilities + Equity
}

// ============================================
// TAX DOCUMENTS TYPES
// ============================================

export interface TaxExpenseCategory {
	category: string
	amount: number
	percentage: number
	deductible: boolean
	notes?: string
}

export interface TaxPropertyDepreciation {
	propertyId: string
	propertyName: string
	propertyValue: number
	annualDepreciation: number
	accumulatedDepreciation: number
	remainingBasis: number
}

export interface TaxIncomeBreakdown {
	grossRentalIncome: number
	totalExpenses: number
	netOperatingIncome: number
	depreciation: number
	mortgageInterest: number
	taxableIncome: number
}

export interface TaxDocumentsData {
	period: FinancialPeriod
	taxYear: number
	incomeBreakdown: TaxIncomeBreakdown
	expenseCategories: TaxExpenseCategory[]
	propertyDepreciation: TaxPropertyDepreciation[]
	totals: {
		totalIncome: number
		totalDeductions: number
		netTaxableIncome: number
	}
	schedule: {
		scheduleE: {
			grossRentalIncome: number
			totalExpenses: number
			depreciation: number
			netIncome: number
		}
	}
}

// ============================================
// UTILITY TYPES
// ============================================

export interface FinancialStatementFilters {
	startDate?: string
	endDate?: string
	propertyIds?: string[]
	comparisonPeriod?: 'month' | 'quarter' | 'year'
}

export type FinancialStatementType =
	| 'income-statement'
	| 'cash-flow'
	| 'balance-sheet'
	| 'tax-documents'
