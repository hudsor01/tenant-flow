// Financials Section Types
// Note: Core financial statement types (RevenueBreakdown, ExpenseBreakdown, MonthlyCashFlow,
// CashFlowCategory, PropertyPL, MonthlyData) are defined in @repo/shared/types/financial-statements.
// Only domain-specific UI types that are unique to this module are defined here.

import type {
	IncomeStatementRevenueBreakdown,
	IncomeStatementExpenseBreakdown,
	CashFlowCategory,
	MonthlyCashFlow
} from '@repo/shared/types/financial-statements'

export interface FinancialsProps {
	// Overview metrics
	overview: FinancialOverview

	// Income statement data
	incomeStatement: IncomeStatement

	// Cash flow data
	cashFlow: CashFlowDataShape

	// Payouts
	payouts: PayoutItem[]

	// Expenses
	expenses: ExpenseItem[]

	// Date range
	dateRange: DateRange

	// Callbacks
	onViewRevenueByProperty: (propertyId: string) => void
	onViewPayoutDetails: (payoutId: string) => void
	onExportIncomeStatement: (format: 'csv' | 'pdf') => void
	onExportTaxDocuments: () => void
	onAddExpense: (data: ExpenseFormData) => void
	onDateRangeChange: (range: DateRange) => void
	onComparePeriods: (period1: DateRange, period2: DateRange) => void
}

export interface FinancialOverview {
	totalRevenue: number
	revenueChange: number
	totalExpenses: number
	expensesChange: number
	netIncome: number
	netIncomeChange: number
	pendingPayouts: number
	availableBalance: number
	nextPayoutDate?: string
	nextPayoutAmount?: number
}

export interface IncomeStatement {
	revenue: IncomeStatementRevenueBreakdown
	expenses: IncomeStatementExpenseBreakdown
	netIncome: number
	byProperty: PropertyFinancials[]
	byMonth: MonthlyFinancials[]
}

export interface PropertyFinancials {
	propertyId: string
	propertyName: string
	revenue: number
	expenses: number
	netIncome: number
	occupancyRate: number
}

export interface MonthlyFinancials {
	month: string
	revenue: number
	expenses: number
	netIncome: number
}

export interface CashFlowDataShape {
	inflows: CashFlowCategory[]
	outflows: CashFlowCategory[]
	netCashFlow: number
	openingBalance: number
	closingBalance: number
	byMonth: MonthlyCashFlow[]
}

export interface PayoutItem {
	id: string
	amount: number
	status: PayoutStatus
	arrivalDate: string
	initiatedAt: string
	bankLast4?: string
	bankName?: string
}

export interface ExpenseItem {
	id: string
	description: string
	category: ExpenseCategory
	amount: number
	propertyName?: string
	date: string
	vendorName?: string
	maintenanceRequestId?: string
}

export interface ExpenseFormData {
	description: string
	category: ExpenseCategory
	amount: number
	propertyId?: string
	date: string
	vendorName?: string
}

export interface DateRange {
	start: string
	end: string
	preset?: 'month' | 'quarter' | 'year' | 'ytd' | 'custom'
}

export type PayoutStatus =
	| 'pending'
	| 'in_transit'
	| 'paid'
	| 'failed'
	| 'cancelled'
export type ExpenseCategory =
	| 'maintenance'
	| 'utilities'
	| 'insurance'
	| 'taxes'
	| 'management'
	| 'other'
