/**
 * Financial Query Keys & Options
 * Query factories for financial domain: overview, statements, tax documents.
 *
 * Financial data uses existing RPCs:
 * - get_dashboard_stats for overview
 * - get_revenue_trends_optimized for monthly metrics
 * - get_expense_summary for expense data
 * - get_billing_insights for billing/balance data
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type {
	IncomeStatementData,
	CashFlowData,
	BalanceSheetData,
	TaxDocumentsData
} from '#shared/types/financial-statements'
import type { ApiResponse } from '#shared/types/api-contracts'
import type { ExpenseCategorySummary } from '#shared/types/analytics'

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface FinancialOverviewData {
	overview: {
		total_revenue: number
		total_expenses: number
		net_income: number
		accounts_receivable: number
		accounts_payable: number
	}
	highlights: Array<{
		label: string
		value: number
		trend: number | null
	}>
}

export interface MonthlyMetric {
	month: string
	revenue: number
	expenses: number
	net_income: number
	cash_flow: number
}

export interface ExpenseSummaryData {
	categories: ExpenseCategorySummary[]
	monthly_totals: Array<{
		month: string
		amount: number
	}>
	total_amount: number
	monthly_average: number
	year_over_year_change: number | null
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const financialKeys = {
	all: ['financials'] as const,
	overview: () => [...financialKeys.all, 'overview'] as const,
	monthly: () => [...financialKeys.all, 'monthly'] as const,
	expenseSummary: () => [...financialKeys.all, 'expense-summary'] as const,
	incomeStatement: (params: { start_date: string; end_date: string }) =>
		[...financialKeys.all, 'income-statement', params] as const,
	cashFlow: (params: { start_date: string; end_date: string }) =>
		[...financialKeys.all, 'cash-flow', params] as const,
	balanceSheet: (asOfDate: string) =>
		[...financialKeys.all, 'balance-sheet', asOfDate] as const,
	taxDocuments: (year: number) =>
		[...financialKeys.all, 'tax-documents', year] as const
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const financialQueries = {
	all: () => financialKeys.all,

	overview: () =>
		queryOptions({
			queryKey: financialKeys.overview(),
			queryFn: async (): Promise<FinancialOverviewData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const userId = user?.id
				if (!userId) {
					return {
						overview: { total_revenue: 0, total_expenses: 0, net_income: 0, accounts_receivable: 0, accounts_payable: 0 },
						highlights: []
					}
				}

				const [dashResult, expenseResult] = await Promise.all([
					supabase.rpc('get_dashboard_stats', { p_user_id: userId }),
					supabase.rpc('get_expense_summary', { p_user_id: userId })
				])

				if (dashResult.error) handlePostgrestError(dashResult.error, 'financial overview')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const revenue = stats?.revenue as Record<string, unknown> | undefined
				const units = stats?.units as Record<string, unknown> | undefined
				const totalRevenue = Number(revenue?.yearly ?? 0)
				const monthlyRevenue = Number(revenue?.monthly ?? 0)
				const expenseSummary = expenseResult.data as Record<string, unknown> | null
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0)

				return {
					overview: {
						total_revenue: totalRevenue,
						total_expenses: totalExpenses,
						net_income: totalRevenue - totalExpenses,
						accounts_receivable: monthlyRevenue,
						accounts_payable: 0
					},
					highlights: [
						{ label: 'Monthly Revenue', value: monthlyRevenue, trend: null },
						{ label: 'Annual Revenue', value: totalRevenue, trend: null },
						{ label: 'Occupancy Rate', value: Number(units?.occupancy_rate ?? 0), trend: null }
					]
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	monthly: () =>
		queryOptions({
			queryKey: financialKeys.monthly(),
			queryFn: async (): Promise<MonthlyMetric[]> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const userId = user?.id
				if (!userId) return []

				const { data, error } = await supabase.rpc('get_revenue_trends_optimized', {
					p_user_id: userId,
					p_months: 12
				})
				if (error) handlePostgrestError(error, 'monthly metrics')

				const rows = (data ?? []) as Array<Record<string, unknown>>

				return rows.map((row): MonthlyMetric => ({
					month: String(row.month ?? row.timeframe ?? ''),
					revenue: Number(row.revenue ?? row.total_revenue ?? 0),
					expenses: Number(row.expenses ?? row.total_expenses ?? 0),
					net_income: Number(row.net_income ?? 0),
					cash_flow: Number(row.revenue ?? row.total_revenue ?? 0) - Number(row.expenses ?? row.total_expenses ?? 0)
				}))
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	expenseSummary: () =>
		queryOptions({
			queryKey: financialKeys.expenseSummary(),
			queryFn: async (): Promise<ExpenseSummaryData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const userId = user?.id
				if (!userId) {
					return { categories: [], monthly_totals: [], total_amount: 0, monthly_average: 0, year_over_year_change: null }
				}

				const { data, error } = await supabase.rpc('get_expense_summary', { p_user_id: userId })
				if (error) handlePostgrestError(error, 'expense summary')

				const summary = data as Record<string, unknown> | null

				return {
					categories: ((summary?.categories ?? []) as Array<Record<string, unknown>>).map(c => ({
						category: String(c.category ?? ''),
						amount: Number(c.amount ?? 0),
						percentage: Number(c.percentage ?? 0)
					})) as ExpenseCategorySummary[],
					monthly_totals: ((summary?.monthly_totals ?? []) as Array<Record<string, unknown>>).map(m => ({
						month: String(m.month ?? ''),
						amount: Number(m.amount ?? 0)
					})),
					total_amount: Number(summary?.total_amount ?? 0),
					monthly_average: Number(summary?.monthly_average ?? 0),
					year_over_year_change: summary?.year_over_year_change !== null && summary?.year_over_year_change !== undefined ? Number(summary.year_over_year_change) : null
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	incomeStatement: (params: { start_date: string; end_date: string }) =>
		queryOptions({
			queryKey: financialKeys.incomeStatement(params),
			queryFn: async (): Promise<ApiResponse<IncomeStatementData>> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const userId = user?.id

				const [dashResult, expenseResult] = userId
					? await Promise.all([
						supabase.rpc('get_dashboard_stats', { p_user_id: userId }),
						supabase.rpc('get_expense_summary', { p_user_id: userId })
					])
					: [{ data: null, error: null }, { data: null, error: null }]

				if (dashResult.error) handlePostgrestError(dashResult.error, 'income statement')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const revenue = stats?.revenue as Record<string, unknown> | undefined
				const totalRevenue = Number(revenue?.yearly ?? 0)
				const expenseSummary = expenseResult.data as Record<string, unknown> | null
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0)

				const data: IncomeStatementData = {
					period: { start_date: params.start_date, end_date: params.end_date, label: `${params.start_date} to ${params.end_date}` },
					revenue: { rentalIncome: totalRevenue, lateFeesIncome: 0, otherIncome: 0, totalRevenue },
					expenses: { propertyManagement: 0, maintenance: 0, utilities: 0, insurance: 0, propertyTax: 0, mortgage: 0, other: totalExpenses, totalExpenses },
					grossProfit: totalRevenue - totalExpenses,
					operatingIncome: totalRevenue - totalExpenses,
					netIncome: totalRevenue - totalExpenses,
					profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
				}

				return { success: true, data }
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	cashFlow: (params: { start_date: string; end_date: string }) =>
		queryOptions({
			queryKey: financialKeys.cashFlow(params),
			queryFn: async (): Promise<ApiResponse<CashFlowData>> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const userId = user?.id

				const [dashResult, expenseResult] = userId
					? await Promise.all([
						supabase.rpc('get_dashboard_stats', { p_user_id: userId }),
						supabase.rpc('get_expense_summary', { p_user_id: userId })
					])
					: [{ data: null, error: null }, { data: null, error: null }]

				if (dashResult.error) handlePostgrestError(dashResult.error, 'cash flow')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const revenue = stats?.revenue as Record<string, unknown> | undefined
				const monthlyRevenue = Number(revenue?.monthly ?? 0)
				const expenseSummary = expenseResult.data as Record<string, unknown> | null
				const monthlyExpenses = Number(expenseSummary?.monthly_average ?? 0)

				const data: CashFlowData = {
					period: { start_date: params.start_date, end_date: params.end_date, label: `${params.start_date} to ${params.end_date}` },
					operatingActivities: {
						rentalPaymentsReceived: monthlyRevenue,
						operatingExpensesPaid: monthlyExpenses,
						maintenancePaid: 0,
						netOperatingCash: monthlyRevenue - monthlyExpenses
					},
					investingActivities: { propertyAcquisitions: 0, propertyImprovements: 0, netInvestingCash: 0 },
					financingActivities: { mortgagePayments: 0, loanProceeds: 0, ownerContributions: 0, ownerDistributions: 0, netFinancingCash: 0 },
					netCashFlow: monthlyRevenue - monthlyExpenses,
					beginningCash: 0,
					endingCash: monthlyRevenue - monthlyExpenses
				}

				return { success: true, data }
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	balanceSheet: (asOfDate: string) =>
		queryOptions({
			queryKey: financialKeys.balanceSheet(asOfDate),
			queryFn: async (): Promise<ApiResponse<BalanceSheetData>> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const userId = user?.id

				const [dashResult, expenseResult, billingResult] = userId
					? await Promise.all([
						supabase.rpc('get_dashboard_stats', { p_user_id: userId }),
						supabase.rpc('get_expense_summary', { p_user_id: userId }),
						supabase.rpc('get_billing_insights', { owner_id_param: userId })
					])
					: [{ data: null, error: null }, { data: null, error: null }, { data: null, error: null }]

				if (dashResult.error) handlePostgrestError(dashResult.error, 'balance sheet')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const revenue = stats?.revenue as Record<string, unknown> | undefined
				const totalRevenue = Number(revenue?.yearly ?? 0)
				const expenseSummary = expenseResult.data as Record<string, unknown> | null
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0)
				const billing = billingResult.data as Record<string, unknown> | null
				const accountsReceivable = Number(billing?.accounts_receivable ?? 0)

				const netIncome = totalRevenue - totalExpenses

				const data: BalanceSheetData = {
					period: { start_date: asOfDate, end_date: asOfDate, label: `As of ${asOfDate}` },
					assets: {
						currentAssets: { cash: totalRevenue, accountsReceivable, security_deposits: 0, total: totalRevenue + accountsReceivable },
						fixedAssets: { propertyValues: 0, accumulatedDepreciation: 0, netPropertyValue: 0, total: 0 },
						totalAssets: totalRevenue + accountsReceivable
					},
					liabilities: {
						currentLiabilities: { accountsPayable: 0, security_depositLiability: 0, accruedExpenses: 0, total: 0 },
						longTermLiabilities: { mortgagesPayable: 0, total: 0 },
						totalLiabilities: 0
					},
					equity: {
						ownerCapital: totalRevenue + accountsReceivable - netIncome,
						retainedEarnings: 0,
						currentPeriodIncome: netIncome,
						totalEquity: totalRevenue + accountsReceivable
					},
					balanceCheck: true
				}

				return { success: true, data }
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	taxDocuments: (year: number) =>
		queryOptions({
			queryKey: financialKeys.taxDocuments(year),
			queryFn: async (): Promise<TaxDocumentsData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const userId = user?.id
				if (!userId) {
					return {
						period: { start_date: `${year}-01-01`, end_date: `${year}-12-31`, label: `Tax Year ${year}` },
						taxYear: year,
						totals: { totalIncome: 0, totalDeductions: 0, netTaxableIncome: 0 },
						incomeBreakdown: { grossRentalIncome: 0, totalExpenses: 0, netOperatingIncome: 0, depreciation: 0, mortgageInterest: 0, taxableIncome: 0 },
						schedule: { scheduleE: { grossRentalIncome: 0, totalExpenses: 0, depreciation: 0, netIncome: 0 } },
						expenseCategories: [],
						propertyDepreciation: []
					}
				}

				const [dashResult, expenseResult] = await Promise.all([
					supabase.rpc('get_dashboard_stats', { p_user_id: userId }),
					supabase.rpc('get_expense_summary', { p_user_id: userId })
				])

				if (dashResult.error) handlePostgrestError(dashResult.error, 'tax documents')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const revenue = stats?.revenue as Record<string, unknown> | undefined
				const totalIncome = Number(revenue?.yearly ?? 0)
				const expenseSummary = expenseResult.data as Record<string, unknown> | null
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0)
				const netIncome = totalIncome - totalExpenses

				return {
					period: { start_date: `${year}-01-01`, end_date: `${year}-12-31`, label: `Tax Year ${year}` },
					taxYear: year,
					totals: { totalIncome, totalDeductions: totalExpenses, netTaxableIncome: netIncome },
					incomeBreakdown: {
						grossRentalIncome: totalIncome,
						totalExpenses,
						netOperatingIncome: netIncome,
						depreciation: 0,
						mortgageInterest: 0,
						taxableIncome: netIncome
					},
					schedule: { scheduleE: { grossRentalIncome: totalIncome, totalExpenses, depreciation: 0, netIncome } },
					expenseCategories: ((expenseSummary?.categories ?? []) as Array<Record<string, unknown>>).map(c => ({
						category: String(c.category ?? ''),
						amount: Number(c.amount ?? 0),
						percentage: Number(c.percentage ?? 0),
						deductible: true
					})),
					propertyDepreciation: []
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		})
}
