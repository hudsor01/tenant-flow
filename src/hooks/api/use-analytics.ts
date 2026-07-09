/**
 * Analytics Hooks & Query Options
 * TanStack Query hooks for analytics data with colocated query options
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonObject } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { PropertyPerformanceEntry } from "#types/analytics";
import type {
	FinancialAnalyticsPageData,
	LeaseAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
	PropertyPerformancePageData,
} from "#types/analytics-page-data";
import type { OwnerPaymentSummaryResponse } from "#types/api-contracts";
import { fetchOccupancyTrends } from "./query-keys/analytics-keys";
import { mapOccupancyAnalytics } from "./query-keys/analytics-mappers";

/**
 * MIS-WIRE (captured follow-up, DATA-01): the "lease analytics" page and the
 * overview page are both fed `get_occupancy_trends_optimized`, which carries
 * NO lease-financial data — so this path returned an empty lease shape via the
 * accidental "array fails the lease object parse -> empty" behavior. Until a
 * real lease-analytics source exists (candidate requirement DATA-04), derive
 * the one occupancy-shaped field the lease page can legitimately carry
 * (`vacancyTrends` = the complement of the occupancy rate) and leave every
 * lease-financial sub-shape (metrics/profitability/lifecycle/statusBreakdown/
 * renewalRates) at its empty default. Do NOT invent a lease-analytics source.
 */
function occupancyAsLeaseAnalytics(raw: unknown): LeaseAnalyticsPageData {
	const { trends } = mapOccupancyAnalytics(raw);
	return {
		metrics: {
			totalLeases: 0,
			activeLeases: 0,
			expiringSoon: 0,
			totalrent_amount: 0,
			averageLeaseValue: 0,
		},
		profitability: [],
		renewalRates: [],
		vacancyTrends: trends.map((t) => ({
			period: t.period,
			vacancyRate: Math.max(0, 100 - t.occupancyRate),
			turnovers: 0,
			avgVacancyDays: 0,
		})),
		leaseDistribution: [],
		lifecycle: [],
		statusBreakdown: [],
	};
}

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
				const { data, error } = await supabase.rpc("get_financial_overview", {
					p_user_id: user.id,
				});
				if (error) handlePostgrestError(error, "analytics");
				return jsonObject<FinancialAnalyticsPageData>(data);
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	leasePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.lease(),
			queryFn: async (): Promise<LeaseAnalyticsPageData> => {
				// MIS-WIRE follow-up (DATA-01): fed the occupancy RPC, not a
				// lease-analytics source — see occupancyAsLeaseAnalytics above.
				return occupancyAsLeaseAnalytics(await fetchOccupancyTrends(12));
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
				return jsonObject<MaintenanceInsightsPageData>(data);
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	occupancyPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.occupancy(),
			queryFn: async (): Promise<OccupancyAnalyticsPageData> => {
				// DATA-01: get_occupancy_trends_optimized returns a jsonb ARRAY
				// (month DESC). Map trends from every row + derive metrics from
				// element[0] via the array-aware mapper. propertyPerformance/
				// seasonalPatterns/vacancyAnalysis stay [] (RPC has no such data).
				return mapOccupancyAnalytics(await fetchOccupancyTrends(12));
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	overviewPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.overview(),
			queryFn: async (): Promise<{
				financial: FinancialAnalyticsPageData;
				maintenance: MaintenanceInsightsPageData;
				lease: LeaseAnalyticsPageData;
			}> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const userId = user.id;

				const [financialResult, maintenanceResult, occupancyData] =
					await Promise.all([
						supabase.rpc("get_financial_overview", { p_user_id: userId }),
						supabase.rpc("get_maintenance_analytics", { user_id: userId }),
						fetchOccupancyTrends(12),
					]);

				if (financialResult.error)
					handlePostgrestError(financialResult.error, "analytics");
				if (maintenanceResult.error)
					handlePostgrestError(maintenanceResult.error, "analytics");

				return {
					financial: jsonObject<FinancialAnalyticsPageData>(
						financialResult.data,
					),
					maintenance: jsonObject<MaintenanceInsightsPageData>(
						maintenanceResult.data,
					),
					// MIS-WIRE follow-up (DATA-01): the overview's `lease` slice is
					// fed the occupancy RPC, not a lease-analytics source — occupancy
					// data is derived into vacancyTrends; lease-financial sub-shapes
					// stay empty (see occupancyAsLeaseAnalytics above).
					lease: occupancyAsLeaseAnalytics(occupancyData),
				};
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	propertyPerformancePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.propertyPerformance(),
			queryFn: async (): Promise<PropertyPerformancePageData> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const { data, error } = await supabase.rpc(
					"get_property_performance_analytics",
					{
						p_user_id: user.id,
					},
				);
				if (error) handlePostgrestError(error, "analytics");
				// `get_property_performance_analytics` returns flat per-property
				// rows; the dashboard contract expects a structured
				// PropertyPerformancePageData with metrics/performance/units/
				// unitStats/visitorAnalytics/revenueTrends. This is a known data
				// gap from the rent-payment demolish; surface what the RPC does
				// give us (per-property revenue + occupancy) under `performance`
				// and leave the rest as empty so each section renders its empty
				// state cleanly instead of throwing on undefined access.
				const rows = data ?? [];
				const totalRevenue = rows.reduce(
					(sum, r) => sum + Number(r.total_revenue ?? 0),
					0,
				);
				const totalOccupancy = rows.reduce(
					(sum, r) => sum + Number(r.occupancy_rate ?? 0),
					0,
				);
				return {
					metrics: {
						totalProperties: rows.length,
						totalUnits: 0,
						occupiedUnits: 0,
						averageOccupancy:
							rows.length > 0 ? totalOccupancy / rows.length : 0,
						totalRevenue,
					},
					performance: rows.map(
						(r): PropertyPerformanceEntry => ({
							property_id: r.property_id,
							propertyName: r.property_name,
							occupancyRate: Number(r.occupancy_rate),
							monthlyRevenue: Number(r.total_revenue),
							annualRevenue: Number(r.total_revenue) * 12,
							totalUnits: 0,
							occupiedUnits: 0,
							vacantUnits: 0,
							trend: "stable",
							trendPercentage: 0,
						}),
					),
					units: [],
					unitStats: [],
					visitorAnalytics: {
						summary: {
							totalVisits: 0,
							totalInquiries: 0,
							totalConversions: 0,
							conversionRate: 0,
						},
						timeline: [],
					},
					revenueTrends: [],
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
				const raw = data as Record<string, unknown> | null;
				return {
					lateFeeTotal:
						typeof raw?.lateFeeTotal === "number" ? raw.lateFeeTotal : 0,
					unpaidTotal:
						typeof raw?.unpaidTotal === "number" ? raw.unpaidTotal : 0,
					unpaidCount:
						typeof raw?.unpaidCount === "number" ? raw.unpaidCount : 0,
					tenantCount:
						typeof raw?.tenantCount === "number" ? raw.tenantCount : 0,
				} as OwnerPaymentSummaryResponse;
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),
};
