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
	fetchDeletedPropertyIds,
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
				if (!user) return { expenseBreakdown: [] };
				// The period's expenses by vendor. The exports' revenue, net income
				// and cash flow come from the income statement and the cash flow
				// (financialQueries), never get_dashboard_stats' scheduled rent.
				const expenseResult = await supabase.rpc("get_expense_summary", {
					p_user_id: user.id,
					...(start_date ? { p_start_date: start_date } : {}),
					...(end_date ? { p_end_date: end_date } : {}),
				});
				// BILL-04: surface an expense-RPC failure instead of reading none.
				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "financial report");
				const expenseSummary = expenseResult.data as Record<
					string,
					unknown
				> | null;
				return {
					expenseBreakdown: (
						(expenseSummary?.categories ?? []) as Array<Record<string, unknown>>
					).map((c) => ({
						category: String(c.category ?? ""),
						amount: Number(c.amount ?? 0),
					})),
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
					return { summary: { totalProperties: 0 }, byProperty: [] };
				}
				// The report's own period when it has one (the export always passes
				// both dates), else the trailing 30 days. Before 20261102163709 the
				// call named no window and got the last 30 days whatever the period.
				const requested =
					start_date && end_date ? { start_date, end_date } : undefined;
				// Every property: the report lists them all. A range also lists
				// a property deleted since, when it received rent or spent in it,
				// which the report names as deleted and leaves out of the
				// portfolio's counts.
				const [{ data, error }, deleted] = await Promise.all([
					fetchEveryPropertyPerformanceRow({
						p_user_id: user.id,
						p_timeframe: requested
							? propertyPerformanceRange(start_date ?? "", end_date ?? "")
							: "30d",
					}),
					fetchDeletedPropertyIds(user.id),
				]);
				if (error) handlePostgrestError(error, "property report");
				if (deleted.error)
					handlePostgrestError(deleted.error, "property report");
				const result = mapPropertyPerformance(
					data,
					requested,
					deleted.data ?? undefined,
				);
				const rows =
					result.status === "ready"
						? result.properties
						: result.occupancy.map((r) => ({
								...r,
								deleted: false,
								rentReceived: null,
								expenses: null,
								netIncome: null,
							}));
				// The portfolio is the properties the owner still has.
				return {
					summary: {
						totalProperties: rows.filter((r) => !r.deleted).length,
					},
					byProperty: rows.map((r) => ({
						propertyId: r.propertyId,
						propertyName: r.propertyName,
						deleted: r.deleted,
						occupancyRate: r.occupancyRate,
						rentReceived: r.rentReceived,
						expenses: r.expenses,
						netIncome: r.netIncome,
					})),
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
						summary: { totalTenants: 0, activeLeases: 0, leasesEndingSoon: 0 },
					};
				}
				// As of today: get_dashboard_stats takes no dates. The report has
				// no source for turnover, on-time payments, payment history or
				// lease expirations by property, so it shows none of them (they
				// were 0 and empty tables).
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
						leasesEndingSoon: Number(leases?.expiringSoon ?? 0),
					},
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
				const [rentReceived, expenseResult, propResult, deleted] =
					await Promise.all([
						fetchRentReceivedInYear(user.id, year, "year-end summary"),
						// BILL-02: scope the year-end expenses to the selected year.
						supabase.rpc("get_expense_summary", {
							p_user_id: user.id,
							p_start_date: taxYear.start_date,
							p_end_date: taxYear.end_date,
						}),
						// Every property: the By Property table must hold the whole year,
						// a property deleted since included (named as deleted).
						fetchEveryPropertyPerformanceRow({
							p_user_id: user.id,
							p_timeframe: taxYearRange(year),
						}),
						fetchDeletedPropertyIds(user.id),
					]);
				// BILL-04: surface expense / property-analytics RPC failures instead of
				// silently zeroing expenses (overstated net income) or the by-property table.
				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "year-end summary");
				if (propResult.error)
					handlePostgrestError(propResult.error, "year-end summary");
				if (deleted.error)
					handlePostgrestError(deleted.error, "year-end summary");
				const properties = mapPropertyPerformance(
					propResult.data,
					taxYear,
					deleted.data ?? undefined,
				);
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
							deleted: p.deleted,
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
