/**
 * Report Query Keys & Options
 * Query factories for reports domain: report CRUD and report runs.
 *
 * Analytics/report-type queries split to report-analytics-keys.ts.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { fetchRevenueTrends } from './analytics-keys'
import type {
	ListReportsResponse,
	Report as ReportType,
	RevenueData
} from '#types/reports'

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
		})
}
