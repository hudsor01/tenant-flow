import type {
	BillingInsightsTimeline,
	BillingInsightsTimelinePoint,
	ExpenseSummaryResponse,
	FinancialAnalyticsPageResponse,
	FinancialBreakdownRow,
	FinancialMetricSummary,
	FinancialOverviewSnapshot,
	InvoiceStatusSummary,
	LeaseFinancialInsight,
	LeaseFinancialSummary,
	MonthlyFinancialMetric,
	NetOperatingIncomeByProperty,
	RevenueExpenseBreakdown
} from '../types/financial-analytics.js'

function toNumber(value: unknown, fallback = 0): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value)
		if (Number.isFinite(parsed)) {
			return parsed
		}
	}

	return fallback
}

function toNumberOrNull(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null
	}

	const parsed = toNumber(value, Number.NaN)
	return Number.isNaN(parsed) ? null : parsed
}

function toString(value: unknown, fallback = ''): string {
	if (typeof value === 'string') {
		return value
	}

	if (typeof value === 'number') {
		return value.toString()
	}

	return fallback
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

export function mapFinancialMetricSummary(
	data: unknown
): FinancialMetricSummary {
	const record = isObject(data) ? data : {}

	const totalRevenue = toNumber(
		record.total_revenue ?? record.revenue ?? record.totalRevenue
	)
	const totalExpenses = toNumber(
		record.total_expenses ?? record.expenses ?? record.totalExpenses
	)
	const netIncome = toNumber(record.net_income ?? record.netIncome)
	const cashFlow = toNumber(record.cash_flow ?? record.cashFlow)

	return {
		totalRevenue,
		totalExpenses,
		netIncome,
		cashFlow,
		revenueTrend: toNumberOrNull(record.revenue_trend ?? record.revenueTrend),
		expenseTrend: toNumberOrNull(record.expense_trend ?? record.expenseTrend),
		profitMargin: toNumberOrNull(record.profit_margin ?? record.profitMargin)
	}
}

function mapBreakdownRows(value: unknown): FinancialBreakdownRow[] {
	if (!Array.isArray(value)) {
		return []
	}

	return value.map(item => {
		const record = isObject(item) ? item : {}
		return {
			label: toString(
				record.label ?? record.name ?? record.category,
				'Unknown'
			),
			value: toNumber(record.value ?? record.amount),
			percentage:
				record.percentage === null || record.percentage === undefined
					? null
					: toNumber(record.percentage, 0),
			change:
				record.change === null || record.change === undefined
					? null
					: toNumber(record.change, 0)
		}
	})
}

export function mapRevenueExpenseBreakdown(
	data: unknown
): RevenueExpenseBreakdown {
	const record = isObject(data) ? data : {}

	const revenueRows = mapBreakdownRows(
		record.revenue ?? record.revenue_breakdown
	)
	const expenseRows = mapBreakdownRows(
		record.expenses ?? record.expense_breakdown
	)

	return {
		revenue: revenueRows,
		expenses: expenseRows,
		totals: {
			revenue: toNumber(
				record.total_revenue ?? record.revenue_total ?? record.revenue
			),
			expenses: toNumber(
				record.total_expenses ?? record.expense_total ?? record.expenses
			),
			netIncome: toNumber(record.net_income ?? record.netIncome)
		}
	}
}

export function mapNetOperatingIncome(
	data: unknown
): NetOperatingIncomeByProperty[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			property_id: toString(record.property_id ?? record.property_id, 'unknown'),
			propertyName: toString(
				record.property_name ?? record.propertyName,
				'Unknown Property'
			),
			noi: toNumber(record.net_operating_income ?? record.noi),
			revenue: toNumber(record.revenue),
			expenses: toNumber(record.expenses),
			margin: toNumber(record.margin ?? record.profit_margin ?? 0)
		}
	})
}

export function mapFinancialOverview(data: unknown): FinancialOverviewSnapshot {
	const record = isObject(data) ? data : {}

	const overview = isObject(record.overview) ? record.overview : record

	const highlightsSource = Array.isArray(record.highlights)
		? record.highlights
		: Array.isArray(record.cards)
			? record.cards
			: []

	return {
		overview: {
			totalRevenue: toNumber(
				overview.total_revenue ?? overview.totalRevenue ?? overview.revenue
			),
			totalExpenses: toNumber(
				overview.total_expenses ?? overview.totalExpenses ?? overview.expenses
			),
			netIncome: toNumber(overview.net_income ?? overview.netIncome),
			accountsReceivable: toNumber(
				overview.accounts_receivable ?? overview.accountsReceivable
			),
			accountsPayable: toNumber(
				overview.accounts_payable ?? overview.accountsPayable
			)
		},
		highlights: highlightsSource.map(item => {
			const highlight = isObject(item) ? item : {}
			return {
				label: toString(highlight.label ?? highlight.title, 'Highlight'),
				value: toNumber(highlight.value ?? highlight.amount),
				trend: highlight.trend === null ? null : toNumber(highlight.trend, 0)
			}
		})
	}
}

function mapBillingPoint(data: unknown): BillingInsightsTimelinePoint {
	const record = isObject(data) ? data : {}
	return {
		period: toString(record.period ?? record.month ?? record.date, ''),
		invoiced: toNumber(record.invoiced ?? record.total_invoiced),
		paid: toNumber(record.paid ?? record.total_paid),
		overdue: toNumber(record.overdue ?? record.total_overdue)
	}
}

export function mapBillingInsights(data: unknown): BillingInsightsTimeline {
	const record = isObject(data) ? data : {}
	const timelineSource = Array.isArray(record.timeline)
		? record.timeline
		: Array.isArray(record.points)
			? record.points
			: Array.isArray(record)
				? record
				: []

	const points = timelineSource.map(mapBillingPoint)

	return {
		points,
		totals: {
			invoiced: toNumber(record.total_invoiced ?? record.invoiced),
			paid: toNumber(record.total_paid ?? record.paid),
			overdue: toNumber(record.total_overdue ?? record.overdue)
		}
	}
}

export function mapExpenseSummary(data: unknown): ExpenseSummaryResponse {
	const record = isObject(data) ? data : {}
	const categoriesSource = Array.isArray(record.categories)
		? record.categories
		: Array.isArray(record.category_breakdown)
			? record.category_breakdown
			: []

	const monthlySource = Array.isArray(record.monthly)
		? record.monthly
		: Array.isArray(record.monthly_totals)
			? record.monthly_totals
			: []

	return {
		categories: categoriesSource.map(item => {
			const category = isObject(item) ? item : {}
			return {
				category: toString(category.category ?? category.label ?? 'Other'),
				amount: toNumber(category.amount ?? category.value),
				percentage: toNumber(category.percentage ?? category.percent, 0)
			}
		}),
		monthlyTotals: monthlySource.map(item => {
			const monthly = isObject(item) ? item : {}
			return {
				month: toString(monthly.month ?? monthly.period, ''),
				amount: toNumber(monthly.amount ?? monthly.value)
			}
		}),
		totals: {
			amount: toNumber(record.total_amount ?? record.total ?? record.amount),
			monthlyAverage: toNumber(
				record.monthly_average ?? record.average ?? record.monthlyAverage
			),
			yearOverYearChange:
				record.year_over_year_change === null
					? null
					: toNumber(record.year_over_year_change ?? record.yoyChange, 0)
		}
	}
}

export function mapInvoiceSummary(data: unknown): InvoiceStatusSummary[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			status: toString(record.status ?? record.label ?? 'unknown'),
			count: toNumber(record.count ?? record.quantity),
			amount: toNumber(record.amount ?? record.total)
		}
	})
}

export function mapMonthlyMetrics(data: unknown): MonthlyFinancialMetric[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			month: toString(record.month ?? record.period ?? ''),
			revenue: toNumber(record.revenue),
			expenses: toNumber(record.expenses),
			netIncome: toNumber(record.net_income ?? record.netIncome),
			cashFlow: toNumber(record.cash_flow ?? record.cashFlow)
		}
	})
}

export function mapLeaseSummary(data: unknown): LeaseFinancialSummary {
	const record = isObject(data) ? data : {}
	return {
		totalLeases: toNumber(record.total_leases ?? record.totalLeases),
		activeLeases: toNumber(record.active_leases ?? record.activeLeases),
		expiringSoon: toNumber(record.expiring_soon ?? record.expiringSoon),
		totalrent_amount: toNumber(
			record.total_monthly_rent ?? record.totalrent_amount
		),
		averageLeaseValue: toNumber(
			record.average_lease_value ?? record.averageLeaseValue
		)
	}
}

export function mapLeaseAnalytics(data: unknown): LeaseFinancialInsight[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			lease_id: toString(record.lease_id ?? record.lease_id, 'unknown'),
			propertyName: toString(
				record.property_name ?? record.propertyName,
				'Unknown Property'
			),
			tenantName: toString(
				record.tenant_name ?? record.tenantName,
				'Unknown Tenant'
			),
			rent_amount: toNumber(record.monthly_rent ?? record.rent),
			outstandingBalance: toNumber(
				record.outstanding_balance ?? record.balance ?? 0
			),
			profitabilityScore:
				record.profitability_score === null
					? null
					: toNumber(record.profitability_score ?? record.score, 0)
		}
	})
}

export function buildFinancialAnalyticsPageResponse(raw: {
	metrics?: unknown
	breakdown?: unknown
	netOperatingIncome?: unknown
	financialOverview?: unknown
	billingInsights?: unknown
	expenseSummary?: unknown
	invoiceSummary?: unknown
	monthlyMetrics?: unknown
	leaseSummary?: unknown
	leaseAnalytics?: unknown
}): FinancialAnalyticsPageResponse {
	return {
		metrics: mapFinancialMetricSummary(raw.metrics),
		breakdown: mapRevenueExpenseBreakdown(raw.breakdown),
		netOperatingIncome: mapNetOperatingIncome(raw.netOperatingIncome),
		financialOverview: mapFinancialOverview(raw.financialOverview),
		billingInsights: mapBillingInsights(raw.billingInsights),
		expenseSummary: mapExpenseSummary(raw.expenseSummary),
		invoiceSummary: mapInvoiceSummary(raw.invoiceSummary),
		monthlyMetrics: mapMonthlyMetrics(raw.monthlyMetrics),
		leaseSummary: mapLeaseSummary(raw.leaseSummary),
		leaseAnalytics: mapLeaseAnalytics(raw.leaseAnalytics)
	}
}
