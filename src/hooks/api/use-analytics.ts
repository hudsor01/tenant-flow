/**
 * Analytics Hooks & Query Options
 * TanStack Query hooks for analytics data with colocated query options
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions } from "@tanstack/react-query";
import { unitStatusLabel } from "#app/(owner)/properties/units/components/unit-status-badge";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonArrayOrEmpty, jsonObjectOrEmpty } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type {
	FinancialMetricSummary,
	LeaseProfitability,
	PropertyPerformanceEntry,
} from "#types/analytics";
import type {
	FinancialAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
	PropertyPerformancePageData,
} from "#types/analytics-page-data";
import type { OwnerPaymentSummaryResponse } from "#types/api-contracts";
import { fetchOccupancyTrends } from "./query-keys/analytics-keys";
import {
	mapFinancialOverview,
	mapLeaseProfitability,
	mapMaintenanceAnalytics,
	mapOccupancyAnalytics,
} from "./query-keys/analytics-mappers";
import {
	fetchCountedUnits,
	fetchEveryPropertyPerformanceRow,
	mapPropertyPerformance,
	unitCountsByProperty,
} from "./query-keys/property-performance-mappers";

/**
 * Analytics query factory
 */
export const analyticsQueries = {
	// Base keys for cache invalidation
	all: () => ["analytics"] as const,
	financial: () => [...analyticsQueries.all(), "financial"] as const,
	lease: () => [...analyticsQueries.all(), "lease"] as const,
	maintenance: () => [...analyticsQueries.all(), "maintenance"] as const,
	occupancy: () => [...analyticsQueries.all(), "occupancy"] as const,
	overview: () => [...analyticsQueries.all(), "overview"] as const,
	propertyPerformance: () =>
		[...analyticsQueries.all(), "property-performance"] as const,
	paymentSummary: () => [...analyticsQueries.all(), "payment-summary"] as const,

	// Query options
	financialPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.financial(),
			queryFn: async (): Promise<FinancialAnalyticsPageData> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const userId = user.id;
				// get_financial_overview carries the headline totals and the lease
				// profitability; the monthly chart, the expense breakdown and the
				// Scheduled Net chart need the revenue-trend + expense series joined
				// by month (TYPE-02). Fetch all three in one round-trip, then map at
				// the boundary — no blind cast to a shape the RPC never returns.
				const [overviewResult, revenueResult, expenseResult] =
					await Promise.all([
						supabase.rpc("get_financial_overview", { p_user_id: userId }),
						supabase.rpc("get_revenue_trends_optimized", {
							p_user_id: userId,
							p_months: 12,
						}),
						supabase.rpc("get_expense_summary", { p_user_id: userId }),
					]);
				if (overviewResult.error)
					handlePostgrestError(overviewResult.error, "analytics");
				if (revenueResult.error)
					handlePostgrestError(revenueResult.error, "analytics");
				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "analytics expenses");
				return mapFinancialOverview(overviewResult.data, {
					revenueRows: jsonArrayOrEmpty<Record<string, unknown>>(
						revenueResult.data,
					),
					expenseSummary: expenseResult.data,
				});
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	/**
	 * Each lease's rent received less its expenses, the year to date
	 * (get_financial_overview's default period): the leases page's table,
	 * through the mapper the financial analytics page's reads.
	 */
	leaseProfitability: () =>
		queryOptions({
			queryKey: [...analyticsQueries.lease(), "profitability"] as const,
			queryFn: async (): Promise<LeaseProfitability> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const { data, error } = await supabase.rpc("get_financial_overview", {
					p_user_id: user.id,
				});
				if (error) handlePostgrestError(error, "analytics");
				return mapLeaseProfitability(data);
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	maintenancePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.maintenance(),
			queryFn: async (): Promise<MaintenanceInsightsPageData> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const { data, error } = await supabase.rpc(
					"get_maintenance_analytics",
					{
						user_id: user.id,
					},
				);
				if (error) handlePostgrestError(error, "analytics");
				return mapMaintenanceAnalytics(data);
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	occupancyPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.occupancy(),
			queryFn: async (): Promise<OccupancyAnalyticsPageData> => {
				// DATA-01: get_occupancy_trends_optimized returns a jsonb ARRAY
				// (month DESC); the properties insights' chart plots each month.
				return mapOccupancyAnalytics(await fetchOccupancyTrends(12));
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	/**
	 * The analytics overview's headline figures: it reads only
	 * `financial.metrics`' scheduled rent and net (get_financial_overview). It
	 * also fetched get_maintenance_analytics and the occupancy series for a
	 * maintenance and a lease slice no screen read (the lease slice's fields
	 * all [] or 0); both went in 66.2-39, and the financial slice's empty
	 * charts, lease profitability and unread figures in fix round 3.
	 */
	overviewPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.overview(),
			queryFn: async (): Promise<{
				financial: {
					metrics: Pick<FinancialMetricSummary, "totalRevenue" | "netIncome">;
				};
			}> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const { data, error } = await supabase.rpc("get_financial_overview", {
					p_user_id: user.id,
				});
				if (error) handlePostgrestError(error, "analytics");
				// The never-throw mapper derives `metrics` from
				// get_financial_overview's `overview` (TYPE-02 sibling); the
				// overview shows the scheduled rent and net alone (the dedicated
				// financial page carries the rest).
				const { totalRevenue, netIncome } = mapFinancialOverview(data).metrics;
				return { financial: { metrics: { totalRevenue, netIncome } } };
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	propertyPerformancePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.propertyPerformance(),
			queryFn: async (): Promise<PropertyPerformancePageData> => {
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				// The trailing 30 days, named rather than left to the default, so
				// the window the page states is the one it asked for; every
				// property, as the page totals and lists them all. Beside it the
				// owner's counted units (not soft-deleted, on a property that is
				// not), which give each property's units and occupancy count, the
				// portfolio's, the unit statistics and the active units list: the
				// RPC carries none of them, and they read 0, "0/0" and empty.
				const [performanceRows, countedUnits] = await Promise.all([
					fetchEveryPropertyPerformanceRow({
						p_user_id: user.id,
						p_timeframe: "30d",
					}),
					fetchCountedUnits(user.id),
				]);
				if (performanceRows.error)
					handlePostgrestError(performanceRows.error, "analytics");
				if (countedUnits.error)
					handlePostgrestError(countedUnits.error, "analytics units");
				const units = countedUnits.data ?? [];
				const byProperty = unitCountsByProperty(units);
				// Rent received is null, never 0, when the server's body predates
				// 20261102163709 (property-performance-mappers.ts).
				const result = mapPropertyPerformance(performanceRows.data);
				const occupancy =
					result.status === "ready" ? result.properties : result.occupancy;
				const totalOccupancy = occupancy.reduce(
					(sum, r) => sum + r.occupancyRate,
					0,
				);
				const received =
					result.status === "ready"
						? new Map(
								result.properties.map((p) => [p.propertyId, p.rentReceived]),
							)
						: null;
				const statusCount = (status: string) =>
					units.filter((u) => u.status === status).length;
				return {
					metrics: {
						totalProperties: occupancy.length,
						totalUnits: units.length,
						occupiedUnits: statusCount("occupied"),
						averageOccupancy:
							occupancy.length > 0 ? totalOccupancy / occupancy.length : 0,
						rentReceived:
							result.status === "ready"
								? result.properties.reduce((sum, p) => sum + p.rentReceived, 0)
								: null,
						rentReceivedWindow:
							result.status === "ready" ? result.window : null,
					},
					performance: occupancy.map((r): PropertyPerformanceEntry => {
						const counts = byProperty.get(r.propertyId);
						return {
							property_id: r.propertyId,
							propertyName: r.propertyName,
							occupancyRate: r.occupancyRate,
							rentReceived: received?.get(r.propertyId) ?? null,
							totalUnits: counts?.total ?? 0,
							occupiedUnits: counts?.occupied ?? 0,
						};
					}),
					units: units.map((u) => ({
						property_id: u.property_id,
						unit_number: u.unit_number,
						status: u.status,
						bedrooms: u.bedrooms,
						bathrooms: u.bathrooms,
						rent: u.rent_amount,
					})),
					// Each status's count, under the units page's labels.
					unitStats: [
						{ label: "Units", value: units.length },
						...(
							["occupied", "available", "reserved", "maintenance"] as const
						).map((status) => ({
							label: unitStatusLabel(status),
							value: statusCount(status),
						})),
					],
				};
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	ownerPaymentSummary: () =>
		queryOptions({
			queryKey: analyticsQueries.paymentSummary(),
			queryFn: async (): Promise<OwnerPaymentSummaryResponse> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const { data, error } = await supabase.rpc("get_billing_insights", {
					owner_id_param: user.id,
				});
				if (error) handlePostgrestError(error, "analytics");
				// Dollars from the rent ledger, and counts (20261102055449). A null
				// payload is "no data yet"; any other non-object throws, so the page
				// shows its error state rather than a summary of zeros.
				const raw = jsonObjectOrEmpty<Record<string, unknown>>(data, {});
				return {
					lateFeeTotal:
						typeof raw.lateFeeTotal === "number" ? raw.lateFeeTotal : 0,
					unpaidTotal:
						typeof raw.unpaidTotal === "number" ? raw.unpaidTotal : 0,
					unpaidCount:
						typeof raw.unpaidCount === "number" ? raw.unpaidCount : 0,
					tenantCount:
						typeof raw.tenantCount === "number" ? raw.tenantCount : 0,
				};
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),
};
