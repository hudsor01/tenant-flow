/**
 * Shared types for financial analytics data structures.
 * These interfaces are used by both the backend NestJS services and
 * the Next.js frontend to ensure contract parity when consuming
 * Supabase RPC responses.
 */

export interface FinancialMetricSummary {
	totalRevenue: number
	totalExpenses: number
	netIncome: number
	cashFlow: number
	revenueTrend?: number | null
	expenseTrend?: number | null
	profitMargin?: number | null
}

export interface FinancialBreakdownRow {
	label: string
	value: number
	percentage?: number | null
	change?: number | null
}

export interface RevenueExpenseBreakdown {
	revenue: FinancialBreakdownRow[]
	expenses: FinancialBreakdownRow[]
	totals: {
		revenue: number
		expenses: number
		netIncome: number
	}
}

export interface NetOperatingIncomeByProperty {
	propertyId: string
	propertyName: string
	noi: number
	revenue: number
	expenses: number
	margin: number
}

export interface FinancialOverviewSnapshot {
	overview: {
		totalRevenue: number
		totalExpenses: number
		netIncome: number
		accountsReceivable: number
		accountsPayable: number
	}
	highlights: Array<{
		label: string
		value: number
		trend?: number | null
	}>
}

export interface BillingInsightsTimelinePoint {
	period: string
	invoiced: number
	paid: number
	overdue: number
}

export interface BillingInsightsTimeline {
	points: BillingInsightsTimelinePoint[]
	totals: {
		invoiced: number
		paid: number
		overdue: number
	}
}

export interface ExpenseCategorySummary {
	category: string
	amount: number
	percentage: number
}

export interface ExpenseSummaryResponse {
	categories: ExpenseCategorySummary[]
	monthlyTotals: Array<{
		month: string
		amount: number
	}>
	totals: {
		amount: number
		monthlyAverage: number
		yearOverYearChange?: number | null
	}
}

export interface InvoiceStatusSummary {
	status: string
	count: number
	amount: number
}

export interface MonthlyFinancialMetric {
	month: string
	revenue: number
	expenses: number
	netIncome: number
	cashFlow: number
}

export interface LeaseFinancialSummary {
	totalLeases: number
	activeLeases: number
	expiringSoon: number
	totalMonthlyRent: number
	averageLeaseValue: number
}

export interface LeaseFinancialInsight {
	leaseId: string
	propertyName: string
	tenantName: string
	monthlyRent: number
	outstandingBalance: number
	profitabilityScore?: number | null
}

export interface FinancialAnalyticsPageResponse {
	metrics: FinancialMetricSummary
	breakdown: RevenueExpenseBreakdown
	netOperatingIncome: NetOperatingIncomeByProperty[]
	financialOverview: FinancialOverviewSnapshot
	billingInsights: BillingInsightsTimeline
	expenseSummary: ExpenseSummaryResponse
	invoiceSummary: InvoiceStatusSummary[]
	monthlyMetrics: MonthlyFinancialMetric[]
	leaseSummary: LeaseFinancialSummary
	leaseAnalytics: LeaseFinancialInsight[]
}
