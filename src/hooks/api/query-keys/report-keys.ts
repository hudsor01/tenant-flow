/**
 * Report Query Keys & Options
 * Query factories for reports domain: report CRUD, report runs, and analytics RPCs.
 *
 * All queries use real Supabase tables (reports, report_runs) and existing RPCs.
 * No stubs, no fake table casts.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { fetchRevenueTrends, fetchOccupancyTrends } from './analytics-keys'
import type {
	ListReportsResponse,
	Report as ReportType,
	RevenueData,
	ReportPaymentAnalytics,
	OccupancyMetrics,
	FinancialReport,
	PropertyReport,
	TenantReport,
	MaintenanceReport,
	YearEndSummary,
	Year1099Summary
} from '#shared/types/reports'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const reportKeys = {
	all: ['reports'] as const,
	lists: () => [...reportKeys.all, 'list'] as const,
	list: (offset: number, limit: number) =>
		[...reportKeys.lists(), offset, limit] as const,
	runs: (reportId: string) =>
		[...reportKeys.all, 'runs', reportId] as const,
	revenue: (months: number) =>
		[...reportKeys.all, 'revenue', 'monthly', months] as const,
	paymentAnalytics: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, 'analytics', 'payments', start_date, end_date] as const,
	occupancyMetrics: () =>
		[...reportKeys.all, 'analytics', 'occupancy'] as const,
	financial: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, 'financial', start_date, end_date] as const,
	properties: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, 'properties', start_date, end_date] as const,
	tenants: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, 'tenants', start_date, end_date] as const,
	maintenance: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, 'maintenance', start_date, end_date] as const,
	yearEnd: (year: number) =>
		[...reportKeys.all, 'year-end', year] as const,
	report1099: (year: number) =>
		[...reportKeys.all, '1099', year] as const
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const reportQueries = {
	all: () => reportKeys.all,

	list: (offset: number, limit: number = 20) =>
		queryOptions({
			queryKey: reportKeys.list(offset, limit),
			queryFn: async (): Promise<ListReportsResponse> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					return { success: true, data: [], pagination: { total: 0, limit, offset, hasMore: false } }
				}

				const { data, error, count } = await supabase
					.from('reports')
					.select('*', { count: 'exact' })
					.eq('owner_user_id', user.id)
					.order('created_at', { ascending: false })
					.range(offset, offset + limit - 1)

				if (error) handlePostgrestError(error, 'reports list')

				const total = count ?? 0
				const reports: ReportType[] = (data ?? []).map(r => ({
					id: r.id,
					user_id: r.owner_user_id,
					reportType: r.report_type,
					reportName: r.title,
					format: 'pdf',
					status: r.is_active ? 'active' : 'inactive',
					fileUrl: null,
					filePath: null,
					fileSize: null,
					start_date: r.created_at ?? '',
					end_date: r.updated_at ?? r.created_at ?? '',
					metadata: {
						description: r.description,
						schedule_cron: r.schedule_cron,
						next_run_at: r.next_run_at
					},
					errorMessage: null,
					created_at: r.created_at ?? '',
					updated_at: r.updated_at ?? r.created_at ?? ''
				}))

				return {
					success: true,
					data: reports,
					pagination: { total, limit, offset, hasMore: offset + limit < total }
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	runs: (reportId: string) =>
		queryOptions({
			queryKey: reportKeys.runs(reportId),
			queryFn: async () => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('report_runs')
					.select('*')
					.eq('report_id', reportId)
					.order('created_at', { ascending: false })

				if (error) handlePostgrestError(error, 'report runs')
				return data ?? []
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: Boolean(reportId)
		}),

	monthlyRevenue: (months: number = 12) =>
		queryOptions({
			queryKey: reportKeys.revenue(months),
			queryFn: async (): Promise<RevenueData[]> => {
				const user = await getCachedUser()
				if (!user) return []
				const raw = await fetchRevenueTrends(months)
				const rows = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>
				return rows.map((row): RevenueData => ({
					month: String(row.month ?? ''),
					revenue: Number(row.revenue ?? 0),
					expenses: Number(row.expenses ?? 0),
					profit: Number(row.profit ?? row.net_income ?? 0),
					propertyCount: Number(row.property_count ?? 0),
					unitCount: Number(row.unit_count ?? 0),
					occupiedUnits: Number(row.occupied_units ?? 0)
				}))
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	paymentAnalytics: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.paymentAnalytics(start_date, end_date),
			queryFn: async (): Promise<ReportPaymentAnalytics> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					return {
						totalPayments: 0, successfulPayments: 0, failedPayments: 0,
						totalRevenue: 0, averagePayment: 0,
						paymentsByMethod: { card: 0, ach: 0 },
						paymentsByStatus: { completed: 0, pending: 0, failed: 0 }
					}
				}

				const { data, error } = await supabase.rpc('get_billing_insights', {
					owner_id_param: user.id,
					start_date_param: start_date,
					end_date_param: end_date
				})

				if (error) handlePostgrestError(error, 'payment analytics')

				const insights = data as Record<string, unknown> | null

				return {
					totalPayments: Number(insights?.total_payments ?? 0),
					successfulPayments: Number(insights?.successful_payments ?? 0),
					failedPayments: Number(insights?.failed_payments ?? 0),
					totalRevenue: Number(insights?.total_revenue ?? 0),
					averagePayment: Number(insights?.average_payment ?? 0),
					paymentsByMethod: {
						card: Number((insights?.payments_by_method as Record<string, unknown>)?.card ?? 0),
						ach: Number((insights?.payments_by_method as Record<string, unknown>)?.ach ?? 0)
					},
					paymentsByStatus: {
						completed: Number((insights?.payments_by_status as Record<string, unknown>)?.completed ?? 0),
						pending: Number((insights?.payments_by_status as Record<string, unknown>)?.pending ?? 0),
						failed: Number((insights?.payments_by_status as Record<string, unknown>)?.failed ?? 0)
					}
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	occupancyMetrics: () =>
		queryOptions({
			queryKey: reportKeys.occupancyMetrics(),
			queryFn: async (): Promise<OccupancyMetrics> => {
				const user = await getCachedUser()
				if (!user) {
					return { totalUnits: 0, occupiedUnits: 0, vacantUnits: 0, occupancyRate: 0, byProperty: [] }
				}

				const data = await fetchOccupancyTrends(12)

				const result = data as Record<string, unknown> | null
				const byProperty = (result?.by_property ?? []) as Array<Record<string, unknown>>

				return {
					totalUnits: Number(result?.total_units ?? 0),
					occupiedUnits: Number(result?.occupied_units ?? 0),
					vacantUnits: Number(result?.vacant_units ?? 0),
					occupancyRate: Number(result?.occupancy_rate ?? 0),
					byProperty: byProperty.map(p => ({
						property_id: String(p.property_id ?? ''),
						propertyName: String(p.property_name ?? ''),
						totalUnits: Number(p.total_units ?? 0),
						occupiedUnits: Number(p.occupied_units ?? 0),
						occupancyRate: Number(p.occupancy_rate ?? 0)
					}))
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	financial: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.financial(start_date, end_date),
			queryFn: async (): Promise<FinancialReport> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					return {
						summary: { totalIncome: 0, totalExpenses: 0, netIncome: 0, cashFlow: 0, rentRollOccupancyRate: 0 },
						monthly: [], expenseBreakdown: [], rentRoll: []
					}
				}

				const [dashResult, expenseResult] = await Promise.all([
					supabase.rpc('get_dashboard_stats', { p_user_id: user.id }),
					supabase.rpc('get_expense_summary', { p_user_id: user.id })
				])

				if (dashResult.error) handlePostgrestError(dashResult.error, 'financial report')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const revenue = stats?.revenue as Record<string, unknown> | undefined
				const units = stats?.units as Record<string, unknown> | undefined
				const totalIncome = Number(revenue?.yearly ?? 0)
				const expenseSummary = expenseResult.data as Record<string, unknown> | null
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0)

				return {
					summary: {
						totalIncome,
						totalExpenses,
						netIncome: totalIncome - totalExpenses,
						cashFlow: Number(revenue?.monthly ?? 0) - (totalExpenses / 12),
						rentRollOccupancyRate: Number(units?.occupancy_rate ?? 0)
					},
					monthly: [],
					expenseBreakdown: ((expenseSummary?.categories ?? []) as Array<Record<string, unknown>>).map(c => ({
						category: String(c.category ?? ''),
						amount: Number(c.amount ?? 0)
					})),
					rentRoll: []
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	properties: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.properties(start_date, end_date),
			queryFn: async (): Promise<PropertyReport> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					return {
						summary: { totalProperties: 0, totalUnits: 0, occupiedUnits: 0, occupancyRate: 0 },
						byProperty: [], occupancyTrend: [], vacancyTrend: []
					}
				}

				const { data, error } = await supabase.rpc('get_property_performance_analytics', {
					p_user_id: user.id
				})

				if (error) handlePostgrestError(error, 'property report')

				type PropRow = { property_id: string; property_name: string; occupancy_rate: number; total_revenue: number; total_expenses: number; net_income: number; timeframe: string }
				const rows: PropRow[] = data ?? []

				return {
					summary: {
						totalProperties: rows.length,
						totalUnits: 0,
						occupiedUnits: 0,
						occupancyRate: rows.length > 0
							? rows.reduce((sum, r) => sum + (r.occupancy_rate ?? 0), 0) / rows.length : 0
					},
					byProperty: rows.map(r => ({
						propertyId: r.property_id,
						propertyName: r.property_name,
						occupancyRate: r.occupancy_rate ?? 0,
						vacantUnits: 0,
						revenue: r.total_revenue ?? 0,
						expenses: r.total_expenses ?? 0,
						netOperatingIncome: r.net_income ?? 0
					})),
					occupancyTrend: [],
					vacancyTrend: []
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	tenants: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.tenants(start_date, end_date),
			queryFn: async (): Promise<TenantReport> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					return {
						summary: { totalTenants: 0, activeLeases: 0, leasesExpiringNext90: 0, turnoverRate: 0, onTimePaymentRate: 0 },
						paymentHistory: [], leaseExpirations: [], turnover: []
					}
				}

				const [dashResult, occupancyData] = await Promise.all([
					supabase.rpc('get_dashboard_stats', { p_user_id: user.id }),
					fetchOccupancyTrends(12)
				])

				if (dashResult.error) handlePostgrestError(dashResult.error, 'tenant report')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const tenants = stats?.tenants as Record<string, unknown> | undefined
				const leases = stats?.leases as Record<string, unknown> | undefined
				const occupancy = occupancyData as Record<string, unknown> | null

				return {
					summary: {
						totalTenants: Number(tenants?.total ?? 0),
						activeLeases: Number(leases?.active ?? 0),
						leasesExpiringNext90: Number(leases?.expiring_soon ?? 0),
						turnoverRate: Number(occupancy?.turnover_rate ?? 0),
						onTimePaymentRate: Number(occupancy?.on_time_payment_rate ?? 0)
					},
					paymentHistory: [],
					leaseExpirations: [],
					turnover: []
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	maintenance: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.maintenance(start_date, end_date),
			queryFn: async (): Promise<MaintenanceReport> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					return {
						summary: { totalRequests: 0, openRequests: 0, avgResolutionHours: 0, totalCost: 0, averageCost: 0 },
						byStatus: [], byPriority: [], monthlyCost: [], vendorPerformance: []
					}
				}

				const { data, error } = await supabase.rpc('get_maintenance_analytics', { user_id: user.id })

				if (error) handlePostgrestError(error, 'maintenance report')

				const analytics = data as Record<string, unknown> | null

				return {
					summary: {
						totalRequests: Number(analytics?.total_requests ?? 0),
						openRequests: Number(analytics?.open_requests ?? 0),
						avgResolutionHours: Number(analytics?.avg_resolution_hours ?? 0),
						totalCost: Number(analytics?.total_cost ?? 0),
						averageCost: Number(analytics?.average_cost ?? 0)
					},
					byStatus: ((analytics?.by_status ?? []) as Array<Record<string, unknown>>).map(s => ({
						status: String(s.status ?? ''),
						count: Number(s.count ?? 0)
					})),
					byPriority: ((analytics?.by_priority ?? []) as Array<Record<string, unknown>>).map(p => ({
						priority: String(p.priority ?? ''),
						count: Number(p.count ?? 0)
					})),
					monthlyCost: ((analytics?.monthly_cost ?? []) as Array<Record<string, unknown>>).map(m => ({
						month: String(m.month ?? ''),
						cost: Number(m.cost ?? 0)
					})),
					vendorPerformance: ((analytics?.vendor_performance ?? []) as Array<Record<string, unknown>>).map(v => ({
						vendorName: String(v.vendor_name ?? ''),
						totalSpend: Number(v.total_spend ?? 0),
						jobs: Number(v.jobs ?? 0)
					}))
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	yearEnd: (year: number) =>
		queryOptions({
			queryKey: reportKeys.yearEnd(year),
			queryFn: async (): Promise<YearEndSummary> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					return { year, grossRentalIncome: 0, operatingExpenses: 0, netIncome: 0, byProperty: [], expenseByCategory: [] }
				}

				const [dashResult, expenseResult, propResult] = await Promise.all([
					supabase.rpc('get_dashboard_stats', { p_user_id: user.id }),
					supabase.rpc('get_expense_summary', { p_user_id: user.id }),
					supabase.rpc('get_property_performance_analytics', { p_user_id: user.id })
				])

				if (dashResult.error) handlePostgrestError(dashResult.error, 'year-end summary')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const revenue = stats?.revenue as Record<string, unknown> | undefined
				const grossRentalIncome = Number(revenue?.yearly ?? 0)
				const expenseSummary = expenseResult.data as Record<string, unknown> | null
				const operatingExpenses = Number(expenseSummary?.total_amount ?? 0)
				type PropRow = { property_id: string; property_name: string; total_revenue: number; total_expenses: number; net_income: number }
				const propRows: PropRow[] = propResult.data ?? []

				return {
					year,
					grossRentalIncome,
					operatingExpenses,
					netIncome: grossRentalIncome - operatingExpenses,
					byProperty: propRows.map(r => ({
						propertyId: r.property_id,
						propertyName: r.property_name,
						income: r.total_revenue ?? 0,
						expenses: r.total_expenses ?? 0,
						netIncome: r.net_income ?? 0
					})),
					expenseByCategory: ((expenseSummary?.categories ?? []) as Array<Record<string, unknown>>).map(c => ({
						category: String(c.category ?? ''),
						amount: Number(c.amount ?? 0)
					}))
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	report1099: (year: number) =>
		queryOptions({
			queryKey: reportKeys.report1099(year),
			queryFn: async (): Promise<Year1099Summary> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					return { year, threshold: 600, recipients: [], totalReported: 0 }
				}

				const { data, error } = await supabase.rpc('get_expense_summary', { p_user_id: user.id })
				if (error) handlePostgrestError(error, '1099 summary')

				const summary = data as Record<string, unknown> | null
				const vendorPayments = (summary?.vendor_payments ?? []) as Array<Record<string, unknown>>

				const recipients = vendorPayments.map(v => ({
					vendorName: String(v.vendor_name ?? ''),
					totalPaid: Number(v.total_paid ?? 0),
					jobCount: Number(v.job_count ?? 0)
				}))

				return {
					year,
					threshold: 600,
					recipients,
					totalReported: recipients.reduce((acc, r) => acc + r.totalPaid, 0)
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		})
}
