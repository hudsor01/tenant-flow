/**
 * Report Analytics Query Options
 * Split from report-keys.ts: analytics/report-type/aggregate queries.
 *
 * Queries: occupancyMetrics, financial, properties, tenants, maintenance,
 * yearEnd, report1099.
 */

import { queryOptions } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type {
	FinancialReport,
	MaintenanceReport,
	OccupancyMetrics,
	PropertyReport,
	TenantReport,
	Year1099Summary,
	YearEndResult,
} from "#types/reports";
import { fetchOccupancyTrends } from "./analytics-keys";
import { mapMaintenanceCosts } from "./analytics-mappers";
import { fetchRentReceivedInYear } from "./financial-keys";
import {
	fetchEveryPropertyPerformanceRow,
	mapPropertyPerformance,
	propertyPerformanceRange,
	taxYearRange,
} from "./property-performance-mappers";
import { reportKeys } from "./report-keys";

const CACHE = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 } as const;

/** Extract first dashboard stats row */
function extractDashStats(data: unknown) {
	// get_dashboard_stats RETURNS json (a bare object, supabase.ts `Returns: Json`) —
	// NOT a SETOF/array. supabase-js returns the object directly, so read it as-is
	// (the old `data[0]` was always undefined → every derived value collapsed to 0).
	const stats = data as Record<string, unknown> | null;
	return {
		revenue: stats?.revenue as Record<string, unknown> | undefined,
		units: stats?.units as Record<string, unknown> | undefined,
		// Occupancy lives under `properties.occupancyRate` (camelCase), NOT
		// `units.occupancy_rate` — the snake_case key the RPC never emits.
		properties: stats?.properties as Record<string, unknown> | undefined,
		tenants: stats?.tenants as Record<string, unknown> | undefined,
		leases: stats?.leases as Record<string, unknown> | undefined,
	};
}

export const reportAnalyticsQueries = {
	occupancyMetrics: () =>
		queryOptions({
			queryKey: reportKeys.occupancyMetrics(),
			queryFn: async (): Promise<OccupancyMetrics> => {
				const user = await getCachedUser();
				if (!user)
					return {
						totalUnits: 0,
						occupiedUnits: 0,
						vacantUnits: 0,
						occupancyRate: 0,
						byProperty: [],
					};
				// DATA-01: get_occupancy_trends_optimized returns a jsonb ARRAY
				// ordered month DESC — element[0] is the latest month. Derive the
				// current occupancy metrics from that row (the RPC has NO top-level
				// totals and NO per-property breakdown, so byProperty stays []).
				const rows = await fetchOccupancyTrends(12);
				const latest = rows[0];
				const totalUnits = Number(latest?.total_units ?? 0);
				const occupiedUnits = Number(latest?.occupied_units ?? 0);
				return {
					totalUnits,
					occupiedUnits,
					vacantUnits: totalUnits - occupiedUnits,
					occupancyRate: Number(latest?.occupancy_rate ?? 0),
					byProperty: [],
				};
			},
			...CACHE,
		}),

	financial: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.financial(start_date, end_date),
			queryFn: async (): Promise<FinancialReport> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) {
					return {
						summary: {
							totalIncome: 0,
							totalExpenses: 0,
							netIncome: 0,
							cashFlow: 0,
							rentRollOccupancyRate: 0,
						},
						monthly: [],
						expenseBreakdown: [],
						rentRoll: [],
					};
				}
				const [dashResult, expenseResult] = await Promise.all([
					supabase.rpc("get_dashboard_stats", { p_user_id: user.id }),
					// BILL-02: scope expenses to the selected period (defaults to YTD).
					supabase.rpc("get_expense_summary", {
						p_user_id: user.id,
						...(start_date ? { p_start_date: start_date } : {}),
						...(end_date ? { p_end_date: end_date } : {}),
					}),
				]);
				if (dashResult.error)
					handlePostgrestError(dashResult.error, "financial report");
				// BILL-04: surface an expense-RPC failure instead of silently reading
				// 0 expenses and overstating net income.
				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "financial report");
				const { revenue, properties } = extractDashStats(dashResult.data);
				const totalIncome = Number(revenue?.yearly ?? 0);
				const expenseSummary = expenseResult.data as Record<
					string,
					unknown
				> | null;
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0);
				return {
					summary: {
						totalIncome,
						totalExpenses,
						netIncome: totalIncome - totalExpenses,
						cashFlow: Number(revenue?.monthly ?? 0) - totalExpenses / 12,
						rentRollOccupancyRate: Number(properties?.occupancyRate ?? 0),
					},
					monthly: [],
					expenseBreakdown: (
						(expenseSummary?.categories ?? []) as Array<Record<string, unknown>>
					).map((c) => ({
						category: String(c.category ?? ""),
						amount: Number(c.amount ?? 0),
					})),
					rentRoll: [],
				};
			},
			...CACHE,
		}),

	properties: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.properties(start_date, end_date),
			queryFn: async (): Promise<PropertyReport> => {
				const user = await getCachedUser();
				if (!user) {
					return {
						summary: {
							totalProperties: 0,
							totalUnits: 0,
							occupiedUnits: 0,
							occupancyRate: 0,
						},
						byProperty: [],
						occupancyTrend: [],
						vacancyTrend: [],
					};
				}
				// The report's own period when it has one (the export always passes
				// both dates), else the trailing 30 days. Before 20261102163709 the
				// call named no window and got the last 30 days whatever the period.
				const requested =
					start_date && end_date ? { start_date, end_date } : undefined;
				// Every property: the report lists them all.
				const { data, error } = await fetchEveryPropertyPerformanceRow({
					p_user_id: user.id,
					p_timeframe: requested
						? propertyPerformanceRange(start_date ?? "", end_date ?? "")
						: "30d",
				});
				if (error) handlePostgrestError(error, "property report");
				const result = mapPropertyPerformance(data, requested);
				const rows =
					result.status === "ready"
						? result.properties
						: result.occupancy.map((r) => ({
								...r,
								rentReceived: null,
								expenses: null,
								netIncome: null,
							}));
				return {
					summary: {
						totalProperties: rows.length,
						totalUnits: 0,
						occupiedUnits: 0,
						occupancyRate:
							rows.length > 0
								? rows.reduce((sum, r) => sum + r.occupancyRate, 0) /
									rows.length
								: 0,
					},
					byProperty: rows.map((r) => ({
						propertyId: r.propertyId,
						propertyName: r.propertyName,
						occupancyRate: r.occupancyRate,
						vacantUnits: 0,
						rentReceived: r.rentReceived,
						expenses: r.expenses,
						netIncome: r.netIncome,
					})),
					occupancyTrend: [],
					vacancyTrend: [],
				};
			},
			...CACHE,
		}),

	tenants: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.tenants(start_date, end_date),
			queryFn: async (): Promise<TenantReport> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) {
					return {
						summary: {
							totalTenants: 0,
							activeLeases: 0,
							leasesExpiringNext90: 0,
							turnoverRate: 0,
							onTimePaymentRate: 0,
						},
						paymentHistory: [],
						leaseExpirations: [],
						turnover: [],
					};
				}
				// MIS-WIRE follow-up (DATA-01): the tenant report has no real source
				// for turnover / on-time-payment — those fields used to be read off
				// get_occupancy_trends_optimized, which never emits them. The occupancy
				// fetch was discarded anyway and coupled the report's success to an
				// unrelated RPC, so it is dropped; both metrics stay 0 below.
				const dashResult = await supabase.rpc("get_dashboard_stats", {
					p_user_id: user.id,
				});
				if (dashResult.error)
					handlePostgrestError(dashResult.error, "tenant report");
				const { tenants, leases } = extractDashStats(dashResult.data);
				return {
					summary: {
						totalTenants: Number(tenants?.total ?? 0),
						activeLeases: Number(leases?.active ?? 0),
						leasesExpiringNext90: Number(leases?.expiringSoon ?? 0),
						turnoverRate: 0,
						onTimePaymentRate: 0,
					},
					paymentHistory: [],
					leaseExpirations: [],
					turnover: [],
				};
			},
			...CACHE,
		}),

	maintenance: (start_date?: string, end_date?: string) =>
		queryOptions({
			queryKey: reportKeys.maintenance(start_date, end_date),
			queryFn: async (): Promise<MaintenanceReport> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) {
					return {
						summary: {
							totalRequests: 0,
							openRequests: 0,
							avgResolutionHours: 0,
						},
						costs: null,
						byStatus: [],
						byPriority: [],
					};
				}
				const { data, error } = await supabase.rpc(
					"get_maintenance_analytics",
					{ user_id: user.id },
				);
				if (error) handlePostgrestError(error, "maintenance report");
				const a = data as Record<string, unknown> | null;
				return {
					summary: {
						totalRequests: Number(a?.total_requests ?? 0),
						openRequests: Number(a?.open_requests ?? 0),
						avgResolutionHours: Number(a?.avg_resolution_hours ?? 0),
					},
					costs: mapMaintenanceCosts(data),
					byStatus: (
						(a?.by_status ?? []) as Array<Record<string, unknown>>
					).map((s) => ({
						status: String(s.status ?? ""),
						count: Number(s.count ?? 0),
					})),
					byPriority: (
						(a?.by_priority ?? []) as Array<Record<string, unknown>>
					).map((p) => ({
						priority: String(p.priority ?? ""),
						count: Number(p.count ?? 0),
					})),
				};
			},
			...CACHE,
		}),

	yearEnd: (year: number) =>
		queryOptions({
			queryKey: reportKeys.yearEnd(year),
			queryFn: async (): Promise<YearEndResult> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				// A cash-basis tax year: rent received from the rent ledger, and
				// each property's over the same calendar year, with the year's
				// expenses. Scheduled rent (get_dashboard_stats) is no year's
				// income: before part L this page printed today's active rent
				// times twelve as any year's, and each property's 30-day $0.
				const taxYear = {
					start_date: `${year}-01-01`,
					end_date: `${year}-12-31`,
				};
				const [rentReceived, expenseResult, propResult] = await Promise.all([
					fetchRentReceivedInYear(user.id, year, "year-end summary"),
					// BILL-02: scope the year-end expenses to the selected year.
					supabase.rpc("get_expense_summary", {
						p_user_id: user.id,
						p_start_date: taxYear.start_date,
						p_end_date: taxYear.end_date,
					}),
					// Every property: the By Property table must hold the whole year.
					fetchEveryPropertyPerformanceRow({
						p_user_id: user.id,
						p_timeframe: taxYearRange(year),
					}),
				]);
				// BILL-04: surface expense / property-analytics RPC failures instead of
				// silently zeroing expenses (overstated net income) or the by-property table.
				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "year-end summary");
				if (propResult.error)
					handlePostgrestError(propResult.error, "year-end summary");
				const properties = mapPropertyPerformance(propResult.data, taxYear);
				if (rentReceived === null || properties.status !== "ready") {
					return { status: "ledger-unavailable", year };
				}
				const expenseSummary = expenseResult.data as Record<
					string,
					unknown
				> | null;
				const operatingExpenses = Number(expenseSummary?.total_amount ?? 0);
				return {
					status: "ready",
					summary: {
						year,
						rentReceived,
						operatingExpenses,
						netIncome:
							Math.round((rentReceived - operatingExpenses) * 100) / 100,
						byProperty: properties.properties.map((p) => ({
							propertyId: p.propertyId,
							propertyName: p.propertyName,
							rentReceived: p.rentReceived,
							expenses: p.expenses,
							netIncome: p.netIncome,
						})),
						expenseByCategory: (
							(expenseSummary?.categories ?? []) as Array<
								Record<string, unknown>
							>
						).map((c) => ({
							category: String(c.category ?? ""),
							amount: Number(c.amount ?? 0),
						})),
					},
				};
			},
			...CACHE,
		}),

	report1099: (year: number) =>
		queryOptions({
			queryKey: reportKeys.report1099(year),
			queryFn: async (): Promise<Year1099Summary> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user)
					return { year, threshold: 600, recipients: [], totalReported: 0 };
				// BILL-02: scope to the selected tax year. (NOTE: get_expense_summary
				// does not emit a `vendor_payments` key, so this report renders empty
				// regardless — a separate pre-existing gap, out of BILL-02 scope.)
				const { data, error } = await supabase.rpc("get_expense_summary", {
					p_user_id: user.id,
					p_start_date: `${year}-01-01`,
					p_end_date: `${year}-12-31`,
				});
				if (error) handlePostgrestError(error, "1099 summary");
				const summary = data as Record<string, unknown> | null;
				const vendorPayments = (summary?.vendor_payments ?? []) as Array<
					Record<string, unknown>
				>;
				const recipients = vendorPayments.map((v) => ({
					vendorName: String(v.vendor_name ?? ""),
					totalPaid: Number(v.total_paid ?? 0),
					jobCount: Number(v.job_count ?? 0),
				}));
				return {
					year,
					threshold: 600,
					recipients,
					totalReported: recipients.reduce((acc, r) => acc + r.totalPaid, 0),
				};
			},
			...CACHE,
		}),
};
