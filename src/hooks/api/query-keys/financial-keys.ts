/**
 * Financial Query Keys, Options & Mutations
 * Query factories for financial domain: overview, statements, tax documents, expense CRUD.
 *
 * Financial data uses existing RPCs:
 * - get_dashboard_stats for overview
 * - revenueTrendsQuery (shared from analytics-keys) for monthly metrics
 * - get_expense_summary for expense data
 * - get_billing_insights for billing/balance data
 */

import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { fetchRevenueTrends } from './analytics-keys'
import { mutationKeys } from '../mutation-keys'
import type { IncomeStatementData, CashFlowData, BalanceSheetData, TaxDocumentsData } from '#types/financial-statements'
import type { ApiResponse } from '#types/api-contracts'
import type { ExpenseCategorySummary } from '#types/analytics'

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface FinancialOverviewData {
	overview: { total_revenue: number; total_expenses: number; net_income: number; accounts_receivable: number; accounts_payable: number }
	highlights: Array<{ label: string; value: number; trend: number | null }>
}

export interface MonthlyMetric {
	month: string; revenue: number; expenses: number; net_income: number; cash_flow: number
}

export interface ExpenseSummaryData {
	categories: ExpenseCategorySummary[]
	monthly_totals: Array<{ month: string; amount: number }>
	total_amount: number; monthly_average: number; year_over_year_change: number | null
}

const CACHE = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 } as const

/** Fetch dashboard + expense RPCs in parallel for authenticated user */
async function fetchDashAndExpense(userId: string) {
	const supabase = createClient()
	const [dashResult, expenseResult] = await Promise.all([
		supabase.rpc('get_dashboard_stats', { p_user_id: userId }),
		supabase.rpc('get_expense_summary', { p_user_id: userId })
	])
	return { dashResult, expenseResult }
}

/** Extract first dashboard stats row */
function parseDashStats(data: unknown) {
	const stats = (data as Array<Record<string, unknown>> | null)?.[0]
	return {
		revenue: stats?.revenue as Record<string, unknown> | undefined,
		units: stats?.units as Record<string, unknown> | undefined
	}
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const financialKeys = {
	all: ['financials'] as const,
	overview: () => [...financialKeys.all, 'overview'] as const,
	monthly: () => [...financialKeys.all, 'monthly'] as const,
	expenseSummary: () => [...financialKeys.all, 'expense-summary'] as const,
	incomeStatement: (params: { start_date: string; end_date: string }) => [...financialKeys.all, 'income-statement', params] as const,
	cashFlow: (params: { start_date: string; end_date: string }) => [...financialKeys.all, 'cash-flow', params] as const,
	balanceSheet: (asOfDate: string) => [...financialKeys.all, 'balance-sheet', asOfDate] as const,
	taxDocuments: (year: number) => [...financialKeys.all, 'tax-documents', year] as const
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
				const user = await getCachedUser()
				if (!user?.id) return { overview: { total_revenue: 0, total_expenses: 0, net_income: 0, accounts_receivable: 0, accounts_payable: 0 }, highlights: [] }
				const { dashResult, expenseResult } = await fetchDashAndExpense(user.id)
				if (dashResult.error) handlePostgrestError(dashResult.error, 'financial overview')
				const { revenue, units } = parseDashStats(dashResult.data)
				const totalRevenue = Number(revenue?.yearly ?? 0)
				const monthlyRevenue = Number(revenue?.monthly ?? 0)
				const totalExpenses = Number((expenseResult.data as Record<string, unknown> | null)?.total_amount ?? 0)
				return {
					overview: { total_revenue: totalRevenue, total_expenses: totalExpenses, net_income: totalRevenue - totalExpenses, accounts_receivable: monthlyRevenue, accounts_payable: 0 },
					highlights: [
						{ label: 'Monthly Revenue', value: monthlyRevenue, trend: null },
						{ label: 'Annual Revenue', value: totalRevenue, trend: null },
						{ label: 'Occupancy Rate', value: Number(units?.occupancy_rate ?? 0), trend: null }
					]
				}
			},
			...CACHE
		}),

	monthly: () =>
		queryOptions({
			queryKey: financialKeys.monthly(),
			queryFn: async (): Promise<MonthlyMetric[]> => {
				const user = await getCachedUser()
				if (!user) return []
				const raw = await fetchRevenueTrends(12)
				const rows = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>
				return rows.map((row): MonthlyMetric => ({
					month: String(row.month ?? row.timeframe ?? ''),
					revenue: Number(row.revenue ?? row.total_revenue ?? 0),
					expenses: Number(row.expenses ?? row.total_expenses ?? 0),
					net_income: Number(row.net_income ?? 0),
					cash_flow: Number(row.revenue ?? row.total_revenue ?? 0) - Number(row.expenses ?? row.total_expenses ?? 0)
				}))
			},
			...CACHE
		}),

	expenseSummary: () =>
		queryOptions({
			queryKey: financialKeys.expenseSummary(),
			queryFn: async (): Promise<ExpenseSummaryData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user?.id) return { categories: [], monthly_totals: [], total_amount: 0, monthly_average: 0, year_over_year_change: null }
				const { data, error } = await supabase.rpc('get_expense_summary', { p_user_id: user.id })
				if (error) handlePostgrestError(error, 'expense summary')
				const s = data as Record<string, unknown> | null
				return {
					categories: ((s?.categories ?? []) as Array<Record<string, unknown>>).map(c => ({ category: String(c.category ?? ''), amount: Number(c.amount ?? 0), percentage: Number(c.percentage ?? 0) })) as ExpenseCategorySummary[],
					monthly_totals: ((s?.monthly_totals ?? []) as Array<Record<string, unknown>>).map(m => ({ month: String(m.month ?? ''), amount: Number(m.amount ?? 0) })),
					total_amount: Number(s?.total_amount ?? 0),
					monthly_average: Number(s?.monthly_average ?? 0),
					year_over_year_change: s?.year_over_year_change !== null && s?.year_over_year_change !== undefined ? Number(s.year_over_year_change) : null
				}
			},
			...CACHE
		}),

	incomeStatement: (params: { start_date: string; end_date: string }) =>
		queryOptions({
			queryKey: financialKeys.incomeStatement(params),
			queryFn: async (): Promise<ApiResponse<IncomeStatementData>> => {
				const user = await getCachedUser()
				if (!user?.id) {
					const empty: IncomeStatementData = { period: { start_date: params.start_date, end_date: params.end_date, label: `${params.start_date} to ${params.end_date}` }, revenue: { rentalIncome: 0, lateFeesIncome: 0, otherIncome: 0, totalRevenue: 0 }, expenses: { propertyManagement: 0, maintenance: 0, utilities: 0, insurance: 0, propertyTax: 0, mortgage: 0, other: 0, totalExpenses: 0 }, grossProfit: 0, operatingIncome: 0, netIncome: 0, profitMargin: 0 }
					return { success: true, data: empty }
				}
				const { dashResult, expenseResult } = await fetchDashAndExpense(user.id)
				if (dashResult.error) handlePostgrestError(dashResult.error, 'income statement')
				const { revenue } = parseDashStats(dashResult.data)
				const totalRevenue = Number(revenue?.yearly ?? 0)
				const totalExpenses = Number((expenseResult.data as Record<string, unknown> | null)?.total_amount ?? 0)
				const net = totalRevenue - totalExpenses
				return { success: true, data: { period: { start_date: params.start_date, end_date: params.end_date, label: `${params.start_date} to ${params.end_date}` }, revenue: { rentalIncome: totalRevenue, lateFeesIncome: 0, otherIncome: 0, totalRevenue }, expenses: { propertyManagement: 0, maintenance: 0, utilities: 0, insurance: 0, propertyTax: 0, mortgage: 0, other: totalExpenses, totalExpenses }, grossProfit: net, operatingIncome: net, netIncome: net, profitMargin: totalRevenue > 0 ? (net / totalRevenue) * 100 : 0 } }
			},
			...CACHE
		}),

	cashFlow: (params: { start_date: string; end_date: string }) =>
		queryOptions({
			queryKey: financialKeys.cashFlow(params),
			queryFn: async (): Promise<ApiResponse<CashFlowData>> => {
				const user = await getCachedUser()
				if (!user?.id) {
					return { success: true, data: { period: { start_date: params.start_date, end_date: params.end_date, label: `${params.start_date} to ${params.end_date}` }, operatingActivities: { rentalPaymentsReceived: 0, operatingExpensesPaid: 0, maintenancePaid: 0, netOperatingCash: 0 }, investingActivities: { propertyAcquisitions: 0, propertyImprovements: 0, netInvestingCash: 0 }, financingActivities: { mortgagePayments: 0, loanProceeds: 0, ownerContributions: 0, ownerDistributions: 0, netFinancingCash: 0 }, netCashFlow: 0, beginningCash: 0, endingCash: 0 } }
				}
				const { dashResult, expenseResult } = await fetchDashAndExpense(user.id)
				if (dashResult.error) handlePostgrestError(dashResult.error, 'cash flow')
				const { revenue } = parseDashStats(dashResult.data)
				const monthlyRevenue = Number(revenue?.monthly ?? 0)
				const monthlyExpenses = Number((expenseResult.data as Record<string, unknown> | null)?.monthly_average ?? 0)
				const net = monthlyRevenue - monthlyExpenses
				return { success: true, data: { period: { start_date: params.start_date, end_date: params.end_date, label: `${params.start_date} to ${params.end_date}` }, operatingActivities: { rentalPaymentsReceived: monthlyRevenue, operatingExpensesPaid: monthlyExpenses, maintenancePaid: 0, netOperatingCash: net }, investingActivities: { propertyAcquisitions: 0, propertyImprovements: 0, netInvestingCash: 0 }, financingActivities: { mortgagePayments: 0, loanProceeds: 0, ownerContributions: 0, ownerDistributions: 0, netFinancingCash: 0 }, netCashFlow: net, beginningCash: 0, endingCash: net } }
			},
			...CACHE
		}),

	balanceSheet: (asOfDate: string) =>
		queryOptions({
			queryKey: financialKeys.balanceSheet(asOfDate),
			queryFn: async (): Promise<ApiResponse<BalanceSheetData>> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user?.id) {
					return { success: true, data: { period: { start_date: asOfDate, end_date: asOfDate, label: `As of ${asOfDate}` }, assets: { currentAssets: { cash: 0, accountsReceivable: 0, security_deposits: 0, total: 0 }, fixedAssets: { propertyValues: 0, accumulatedDepreciation: 0, netPropertyValue: 0, total: 0 }, totalAssets: 0 }, liabilities: { currentLiabilities: { accountsPayable: 0, security_depositLiability: 0, accruedExpenses: 0, total: 0 }, longTermLiabilities: { mortgagesPayable: 0, total: 0 }, totalLiabilities: 0 }, equity: { ownerCapital: 0, retainedEarnings: 0, currentPeriodIncome: 0, totalEquity: 0 }, balanceCheck: true } }
				}
				const [{ dashResult, expenseResult }, billingResult] = await Promise.all([
					fetchDashAndExpense(user.id),
					supabase.rpc('get_billing_insights', { owner_id_param: user.id })
				])
				if (dashResult.error) handlePostgrestError(dashResult.error, 'balance sheet')
				const { revenue } = parseDashStats(dashResult.data)
				const totalRevenue = Number(revenue?.yearly ?? 0)
				const totalExpenses = Number((expenseResult.data as Record<string, unknown> | null)?.total_amount ?? 0)
				const ar = Number((billingResult.data as Record<string, unknown> | null)?.accounts_receivable ?? 0)
				const net = totalRevenue - totalExpenses
				const totalAssets = totalRevenue + ar
				return { success: true, data: { period: { start_date: asOfDate, end_date: asOfDate, label: `As of ${asOfDate}` }, assets: { currentAssets: { cash: totalRevenue, accountsReceivable: ar, security_deposits: 0, total: totalAssets }, fixedAssets: { propertyValues: 0, accumulatedDepreciation: 0, netPropertyValue: 0, total: 0 }, totalAssets }, liabilities: { currentLiabilities: { accountsPayable: 0, security_depositLiability: 0, accruedExpenses: 0, total: 0 }, longTermLiabilities: { mortgagesPayable: 0, total: 0 }, totalLiabilities: 0 }, equity: { ownerCapital: totalAssets - net, retainedEarnings: 0, currentPeriodIncome: net, totalEquity: totalAssets }, balanceCheck: true } }
			},
			...CACHE
		})
}

// ============================================================================
// TAX DOCUMENT QUERY OPTIONS
// ============================================================================

export const financialTaxQueries = {
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

// ============================================================================
// EXPENSE QUERY KEYS (separate root from financialKeys to preserve cache structure)
// ============================================================================

export const expenseKeys = {
	all: ['expenses'] as const,
	list: () => [...expenseKeys.all, 'list'] as const,
	detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
	byProperty: (propertyId: string) =>
		[...expenseKeys.all, 'property', propertyId] as const,
	byCategory: (category: string) =>
		[...expenseKeys.all, 'category', category] as const,
	byDateRange: (start: string, end: string) =>
		[...expenseKeys.all, 'dateRange', start, end] as const
}

export const taxDocumentKeys = {
	all: ['taxDocuments'] as const,
	byYear: (taxYear: number) => [...taxDocumentKeys.all, taxYear] as const
}

// ============================================================================
// EXPENSE QUERY OPTIONS
// ============================================================================

export const expenseQueries = {
	list: (options?: { enabled?: boolean }) =>
		queryOptions({
			queryKey: expenseKeys.list(),
			queryFn: async (): Promise<Expense[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('expenses')
					.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
					.order('expense_date', { ascending: false })
				if (error) handlePostgrestError(error, 'expenses')
				return (data ?? []) as Expense[]
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: options?.enabled ?? true
		}),

	byProperty: (propertyId: string, options?: { enabled?: boolean }) =>
		queryOptions({
			queryKey: expenseKeys.byProperty(propertyId),
			queryFn: async (): Promise<Expense[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('expenses')
					.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
					.order('expense_date', { ascending: false })
				if (error) handlePostgrestError(error, 'expenses by property')
				void propertyId
				return (data ?? []) as Expense[]
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: (options?.enabled ?? true) && Boolean(propertyId)
		}),

	byDateRange: (startDate: string, endDate: string, options?: { enabled?: boolean }) =>
		queryOptions({
			queryKey: expenseKeys.byDateRange(startDate, endDate),
			queryFn: async (): Promise<Expense[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('expenses')
					.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
					.gte('expense_date', startDate)
					.lte('expense_date', endDate)
					.order('expense_date', { ascending: false })
				if (error) handlePostgrestError(error, 'expenses by date range')
				return (data ?? []) as Expense[]
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: (options?.enabled ?? true) && Boolean(startDate) && Boolean(endDate)
		})
}

// ============================================================================
// EXPENSE TYPES
// ============================================================================

export interface CreateExpenseInput {
	amount: number
	expense_date: string
	maintenance_request_id: string
	vendor_name?: string
}

export interface Expense {
	id: string
	description?: string
	category?: string
	amount?: number
	property_name?: string
	property_id?: string
	expense_date?: string
	vendor_name?: string
	maintenance_request_id?: string
	created_at?: string
}

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const financialMutations = {
	createExpense: () =>
		mutationOptions({
			mutationKey: mutationKeys.expenses.create,
			mutationFn: async (input: CreateExpenseInput): Promise<Expense> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('expenses')
					.insert({
						amount: input.amount,
						expense_date: input.expense_date,
						maintenance_request_id: input.maintenance_request_id,
						vendor_name: input.vendor_name
					})
					.select('id, amount, expense_date, vendor_name, maintenance_request_id, created_at')
					.single()
				if (error) handlePostgrestError(error, 'create expense')
				return data as Expense
			}
		}),

	deleteExpense: () =>
		mutationOptions({
			mutationKey: mutationKeys.expenses.delete,
			mutationFn: async (expenseId: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('expenses')
					.delete()
					.eq('id', expenseId)
				if (error) handlePostgrestError(error, 'delete expense')
			}
		})
}
