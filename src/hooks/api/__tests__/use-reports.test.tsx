/**
 * Reports Hooks Tests
 *
 * Tests the report hooks and the report query leaves the generated exports read
 * (src/lib/reports/report-data.ts) against mocked RPCs.
 */

import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportAnalyticsQueries } from "../query-keys/report-analytics-keys";
import { reportKeys, reportQueries } from "../query-keys/report-keys";
import { useReport1099Summary, useYearEndSummary } from "../use-reports";

// Mock Supabase client using vi.hoisted() to avoid initialization errors
const { mockRpc, mockGetCachedUser } = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	mockGetCachedUser: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		rpc: mockRpc,
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
		},
	}),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return createElement(
			QueryClientProvider,
			{ client: queryClient },
			children,
		);
	};
}

describe("reportKeys", () => {
	it("generates correct query keys", () => {
		expect(reportKeys.all).toEqual(["reports"]);
		expect(reportKeys.revenue(12)).toEqual([
			"reports",
			"revenue",
			"monthly",
			12,
		]);
		expect(reportKeys.occupancyMetrics()).toEqual([
			"reports",
			"analytics",
			"occupancy",
		]);
		expect(reportKeys.financial("2024-01-01", "2024-12-31")).toEqual([
			"reports",
			"financial",
			"2024-01-01",
			"2024-12-31",
		]);
		expect(reportKeys.yearEnd(2024)).toEqual(["reports", "year-end", 2024]);
		expect(reportKeys.report1099(2024)).toEqual(["reports", "1099", 2024]);
	});
});

describe("reportQueries.monthlyRevenue", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches monthly revenue data from get_revenue_trends_optimized", async () => {
		// reportQueries.monthlyRevenue joins revenue with real per-month expenses via
		// fetchRevenueWithExpenses: get_revenue_trends_optimized (revenue-only)
		// then get_expense_summary (monthly_totals). profit = revenue - joined
		// expenses; the phantom expenses/profit/count keys are gone (TYPE-06).
		mockRpc
			.mockResolvedValueOnce({
				data: [
					{ month: "2024-01", revenue: 40000 },
					{ month: "2024-02", revenue: 42000 },
				],
				error: null,
			})
			.mockResolvedValueOnce({
				data: {
					monthly_totals: [
						{ month: "2024-01", amount: 10000 },
						{ month: "2024-02", amount: 11000 },
					],
				},
				error: null,
			});

		const { result } = renderHook(
			() => useQuery(reportQueries.monthlyRevenue(12)),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.length).toBe(2);
		expect(result.current.data?.[0]?.month).toBe("2024-01");
		expect(result.current.data?.[0]?.revenue).toBe(40000);
		expect(result.current.data?.[0]?.expenses).toBe(10000);
		expect(result.current.data?.[0]?.profit).toBe(30000);
		expect(mockRpc).toHaveBeenCalledWith("get_revenue_trends_optimized", {
			p_user_id: "user-1",
			p_months: 12,
		});
	});

	it("returns empty array when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(
			() => useQuery(reportQueries.monthlyRevenue()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});

describe("reportAnalyticsQueries.occupancyMetrics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches occupancy data from get_occupancy_trends_optimized", async () => {
		mockRpc.mockResolvedValueOnce({
			data: [
				{
					month: "2024-01",
					total_units: 20,
					occupied_units: 18,
					vacant_units: 2,
					occupancy_rate: 90,
					by_property: [],
				},
			],
			error: null,
		});

		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.occupancyMetrics()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// DATA-01: metrics derive from element[0] (the latest month) of the
		// occupancy-trends array — regression-lock the concrete values.
		expect(result.current.data?.occupancyRate).toBe(90);
		expect(result.current.data?.totalUnits).toBe(20);
		expect(result.current.data?.occupiedUnits).toBe(18);
		expect(result.current.data?.vacantUnits).toBe(2);
		expect(result.current.data?.byProperty).toEqual([]);
		expect(mockRpc).toHaveBeenCalledWith(
			"get_occupancy_trends_optimized",
			expect.objectContaining({
				p_owner_id: "user-1",
			}),
		);
	});

	it("returns defaults when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.occupancyMetrics()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.totalUnits).toBe(0);
		expect(result.current.data?.occupancyRate).toBe(0);
	});
});

describe("reportAnalyticsQueries.financial", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches financial report from parallel RPCs", async () => {
		// financial() calls get_dashboard_stats + get_expense_summary
		mockRpc
			.mockResolvedValueOnce({
				data: {
					revenue: { yearly: 600000, monthly: 50000 },
					properties: { occupancyRate: 95 },
				},
				error: null,
			})
			.mockResolvedValueOnce({
				data: {
					total_amount: 200000,
					categories: [
						{ category: "maintenance", amount: 100000, percentage: 50 },
					],
				},
				error: null,
			});

		const { result } = renderHook(
			() =>
				useQuery(reportAnalyticsQueries.financial("2024-01-01", "2024-12-31")),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.summary?.totalIncome).toBe(600000);
		expect(result.current.data?.summary?.totalExpenses).toBe(200000);
		expect(result.current.data?.summary?.netIncome).toBe(400000);
	});
});

describe("reportAnalyticsQueries.maintenance", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches maintenance analytics", async () => {
		// get_maintenance_analytics as its body returns them: the cost keys are
		// the literal 0 and empty arrays (20260304120000).
		mockRpc.mockResolvedValueOnce({
			data: {
				total_requests: 25,
				open_requests: 3,
				avg_resolution_hours: 48,
				total_cost: 0,
				average_cost: 0,
				by_status: [{ status: "open", count: 3 }],
				by_priority: [{ priority: "high", count: 5 }],
				monthly_cost: [],
				vendor_performance: [],
			},
			error: null,
		});

		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.maintenance()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.summary?.totalRequests).toBe(25);
		expect(result.current.data?.summary?.openRequests).toBe(3);
		// No cost figure reaches the report: each would be a hard-coded 0.
		expect(result.current.data?.summary).not.toHaveProperty("totalCost");
		expect(result.current.data?.summary).not.toHaveProperty("averageCost");
		expect(result.current.data).not.toHaveProperty("monthlyCost");
		expect(result.current.data).not.toHaveProperty("vendorPerformance");
		expect(mockRpc).toHaveBeenCalledWith("get_maintenance_analytics", {
			user_id: "user-1",
		});
	});
});

/**
 * Answer the year-end page's RPCs by name and arguments: the rent ledger as of
 * December 31 of 2024 and 2023 (get_billing_insights, 20261102055449), the
 * year's expenses, and each property over the calendar year.
 */
function answerYearEnd(answers: {
	collectedAt2024End: unknown;
	collectedAt2023End: unknown;
	expenses: unknown;
	properties: unknown;
}) {
	mockRpc.mockImplementation(
		async (fn: string, args: Record<string, unknown>) => {
			if (fn === "get_billing_insights") {
				const collected =
					args.end_date_param === "2024-12-31"
						? answers.collectedAt2024End
						: answers.collectedAt2023End;
				return {
					data: collected === undefined ? {} : { collectedTotal: collected },
					error: null,
				};
			}
			if (fn === "get_expense_summary") {
				return { data: answers.expenses, error: null };
			}
			if (fn === "get_property_performance_analytics") {
				return { data: answers.properties, error: null };
			}
			throw new Error(`the year-end page reads no ${fn}`);
		},
	);
}

describe("useYearEndSummary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("reads the tax year's rent received from the ledger, each property's over the year", async () => {
		answerYearEnd({
			collectedAt2024End: 612000,
			collectedAt2023End: 112000,
			expenses: { total_amount: 120000, categories: [] },
			properties: [
				{
					property_id: "p1",
					property_name: "Test",
					total_revenue: 500000,
					total_expenses: 120000,
					net_income: 380000,
					occupancy_rate: 95,
					timeframe: "2024-01-01/2024-12-31",
				},
			],
		});

		const { result } = renderHook(() => useYearEndSummary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const data = result.current.data;
		if (data?.status !== "ready") throw new Error("expected a summary");
		expect(data.summary.year).toBe(2024);
		expect(data.summary.rentReceived).toBe(500000);
		expect(data.summary.operatingExpenses).toBe(120000);
		expect(data.summary.netIncome).toBe(380000);
		expect(data.summary.byProperty[0]?.rentReceived).toBe(500000);
		// The calendar year, not the function's trailing 30-day default.
		expect(mockRpc).toHaveBeenCalledWith("get_property_performance_analytics", {
			p_user_id: "user-1",
			p_timeframe: "2024-01-01..2024-12-31",
		});
		expect(mockRpc).toHaveBeenCalledWith("get_billing_insights", {
			owner_id_param: "user-1",
			end_date_param: "2023-12-31",
		});
	});

	it.each([
		[
			"no ledger totals (get_billing_insights before 20261102055449)",
			undefined,
			"2024-01-01/2024-12-31",
		],
		[
			"the property body before 20261102163709, which echoes the request",
			612000,
			"2024-01-01..2024-12-31",
		],
		["a property window that is not the year", 612000, "2024-12-02/2024-12-31"],
	])(
		"reports the year unavailable from %s",
		async (_what, collected, timeframe) => {
			answerYearEnd({
				collectedAt2024End: collected,
				collectedAt2023End: collected === undefined ? undefined : 112000,
				expenses: { total_amount: 120000, categories: [] },
				properties: [
					{
						property_id: "p1",
						property_name: "Test",
						total_revenue: 0,
						total_expenses: 120000,
						net_income: -120000,
						occupancy_rate: 95,
						timeframe,
					},
				],
			});
			const { result } = renderHook(() => useYearEndSummary(2024), {
				wrapper: createWrapper(),
			});
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
			expect(result.current.data).toEqual({
				status: "ledger-unavailable",
				year: 2024,
			});
		},
	);
});

describe("useReport1099Summary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches 1099 vendor data from get_expense_summary", async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				vendor_payments: [
					{ vendor_name: "Plumber Inc", total_paid: 15000, job_count: 5 },
					{ vendor_name: "Electrician LLC", total_paid: 8000, job_count: 3 },
				],
			},
			error: null,
		});

		const { result } = renderHook(() => useReport1099Summary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.year).toBe(2024);
		expect(result.current.data?.threshold).toBe(600);
		expect(result.current.data?.recipients?.length).toBe(2);
		expect(result.current.data?.totalReported).toBe(23000);
		expect(mockRpc).toHaveBeenCalledWith("get_expense_summary", {
			p_user_id: "user-1",
			p_start_date: "2024-01-01",
			p_end_date: "2024-12-31",
		});
	});

	it("returns defaults when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(() => useReport1099Summary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.year).toBe(2024);
		expect(result.current.data?.recipients).toEqual([]);
		expect(result.current.data?.totalReported).toBe(0);
	});
});

describe("reportAnalyticsQueries.properties", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches property report from get_property_performance_analytics", async () => {
		mockRpc.mockResolvedValueOnce({
			data: [
				{
					property_id: "p1",
					property_name: "Maple Court",
					occupancy_rate: 90,
					total_revenue: 120000,
					total_expenses: 30000,
					net_income: 90000,
					timeframe: "2024-01-01/2024-12-31",
				},
				{
					property_id: "p2",
					property_name: "Oak Villa",
					occupancy_rate: 100,
					total_revenue: 80000,
					total_expenses: 20000,
					net_income: 60000,
					timeframe: "2024-01-01/2024-12-31",
				},
			],
			error: null,
		});

		const { result } = renderHook(
			() =>
				useQuery(reportAnalyticsQueries.properties("2024-01-01", "2024-12-31")),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.summary?.totalProperties).toBe(2);
		// average occupancy across the two rows: (90 + 100) / 2 = 95
		expect(result.current.data?.summary?.occupancyRate).toBe(95);
		expect(result.current.data?.byProperty?.length).toBe(2);
		expect(result.current.data?.byProperty?.[0]?.propertyName).toBe(
			"Maple Court",
		);
		expect(result.current.data?.byProperty?.[1]?.rentReceived).toBe(80000);
		// The export's own period, not the function's 30-day default.
		expect(mockRpc).toHaveBeenCalledWith("get_property_performance_analytics", {
			p_user_id: "user-1",
			p_timeframe: "2024-01-01..2024-12-31",
		});
	});

	it.each([
		[
			"the body before 20261102163709, which echoes the request",
			"2024-01-01..2024-12-31",
		],
		["a body that computed another window", "2024-12-02/2024-12-31"],
		["no window at all", null],
	])("reports no rent received from %s", async (_what, timeframe) => {
		mockRpc.mockResolvedValueOnce({
			data: [
				{
					property_id: "p1",
					property_name: "Maple Court",
					occupancy_rate: 90,
					total_revenue: 0,
					total_expenses: 300,
					net_income: -300,
					timeframe,
				},
			],
			error: null,
		});

		const { result } = renderHook(
			() =>
				useQuery(reportAnalyticsQueries.properties("2024-01-01", "2024-12-31")),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.byProperty).toEqual([
			{
				propertyId: "p1",
				propertyName: "Maple Court",
				occupancyRate: 90,
				vacantUnits: 0,
				rentReceived: null,
				expenses: null,
				netIncome: null,
			},
		]);
	});

	it("asks for the trailing 30 days when the report has no period", async () => {
		mockRpc.mockResolvedValueOnce({ data: [], error: null });
		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.properties()),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(mockRpc).toHaveBeenCalledWith("get_property_performance_analytics", {
			p_user_id: "user-1",
			p_timeframe: "30d",
		});
	});

	it("returns defaults when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.properties()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.summary?.totalProperties).toBe(0);
		expect(result.current.data?.byProperty).toEqual([]);
		expect(mockRpc).not.toHaveBeenCalled();
	});
});

describe("reportAnalyticsQueries.tenants", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches tenant report from get_dashboard_stats", async () => {
		// tenants() issues a single get_dashboard_stats call; turnover /
		// on-time-payment have no data source, so both stay 0.
		mockRpc.mockResolvedValueOnce({
			data: {
				tenants: { total: 12 },
				leases: { active: 9, expiringSoon: 2 },
			},
			error: null,
		});

		const { result } = renderHook(
			() =>
				useQuery(reportAnalyticsQueries.tenants("2024-01-01", "2024-12-31")),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.summary?.totalTenants).toBe(12);
		expect(result.current.data?.summary?.activeLeases).toBe(9);
		expect(result.current.data?.summary?.leasesExpiringNext90).toBe(2);
		expect(result.current.data?.summary?.turnoverRate).toBe(0);
		expect(result.current.data?.summary?.onTimePaymentRate).toBe(0);
		expect(mockRpc).toHaveBeenCalledWith("get_dashboard_stats", {
			p_user_id: "user-1",
		});
	});

	it("returns defaults when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.tenants()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.summary?.totalTenants).toBe(0);
		expect(result.current.data?.summary?.activeLeases).toBe(0);
		expect(mockRpc).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Error-path coverage — every query hook propagates an RPC / auth failure to
// isError instead of silently swallowing it. PostgREST errors flow through
// handlePostgrestError (Sentry capture + re-throw); the auth-missing branches
// that throw "Not authenticated" come from the shared fetch* helpers.
// ---------------------------------------------------------------------------

// PostgrestError-shaped object so handlePostgrestError reads message/code/etc.
const postgrestError = {
	message: "permission denied for function",
	code: "42501",
	details: "",
	hint: "",
} as const;

describe("reportQueries.monthlyRevenue (error paths)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_revenue_trends_optimized RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(
			() => useQuery(reportQueries.monthlyRevenue(12)),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});

	it("surfaces isError when getCachedUser rejects", async () => {
		mockGetCachedUser.mockRejectedValueOnce(new Error("session lookup failed"));

		const { result } = renderHook(
			() => useQuery(reportQueries.monthlyRevenue(12)),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("session lookup failed"),
		});
		expect(mockRpc).not.toHaveBeenCalled();
	});
});

describe("reportAnalyticsQueries.occupancyMetrics (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_occupancy_trends_optimized RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.occupancyMetrics()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

describe("reportAnalyticsQueries.financial (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_dashboard_stats RPC errors", async () => {
		// financial() runs get_dashboard_stats + get_expense_summary in parallel;
		// a dashResult.error must propagate through handlePostgrestError.
		mockRpc
			.mockResolvedValueOnce({ data: null, error: postgrestError })
			.mockResolvedValueOnce({
				data: { total_amount: 0, categories: [] },
				error: null,
			});

		const { result } = renderHook(
			() =>
				useQuery(reportAnalyticsQueries.financial("2024-01-01", "2024-12-31")),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

describe("reportAnalyticsQueries.maintenance (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_maintenance_analytics RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.maintenance()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

describe("useYearEndSummary (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_dashboard_stats RPC errors", async () => {
		// yearEnd() runs 3 RPCs in parallel; dashResult.error must propagate.
		mockRpc
			.mockResolvedValueOnce({ data: null, error: postgrestError })
			.mockResolvedValueOnce({
				data: { total_amount: 0, categories: [] },
				error: null,
			})
			.mockResolvedValueOnce({ data: [], error: null });

		const { result } = renderHook(() => useYearEndSummary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

describe("useReport1099Summary (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_expense_summary RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(() => useReport1099Summary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

describe("reportAnalyticsQueries.properties (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_property_performance_analytics RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(
			() =>
				useQuery(reportAnalyticsQueries.properties("2024-01-01", "2024-12-31")),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

describe("reportAnalyticsQueries.tenants (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_dashboard_stats RPC errors", async () => {
		// tenants() issues a single get_dashboard_stats call; its error must
		// propagate through handlePostgrestError.
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(
			() => useQuery(reportAnalyticsQueries.tenants()),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

// ---------------------------------------------------------------------------
// Dollar-magnitude correctness — all `amount` columns store DOLLARS as
// numeric(10,2). The RPC->hook boundary must pass money through unchanged: no
// *100 / /100 cents conversion (cents only ever appears at the Stripe boundary,
// which is NOT in these read hooks). Each assertion seeds an odd-magnitude
// dollar value that would visibly drift if any cents math leaked in.
// ---------------------------------------------------------------------------

describe("dollar magnitude is preserved through RPC->hook boundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("reportQueries.monthlyRevenue forwards revenue/expenses/profit as dollars (no cents math)", async () => {
		// 12345.67 dollars: *100 would yield 1234567, /100 would yield 123.4567.
		// expenses now join in from get_expense_summary.monthly_totals; profit =
		// revenue - joined expenses = 12345.67 - 2345.89 = 9999.78 (TYPE-06).
		mockRpc
			.mockResolvedValueOnce({
				data: [{ month: "2024-03", revenue: 12345.67 }],
				error: null,
			})
			.mockResolvedValueOnce({
				data: { monthly_totals: [{ month: "2024-03", amount: 2345.89 }] },
				error: null,
			});

		const { result } = renderHook(
			() => useQuery(reportQueries.monthlyRevenue(12)),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const row = result.current.data?.[0];
		expect(row?.revenue).toBe(12345.67);
		expect(row?.expenses).toBe(2345.89);
		expect(row?.profit).toBe(9999.78);
	});

	it("reportAnalyticsQueries.financial keeps dollar income/expense/netIncome arithmetic in dollars", async () => {
		const yearlyIncome = 600000.5;
		const totalExpenses = 200000.25;
		mockRpc
			.mockResolvedValueOnce({
				data: {
					revenue: { yearly: yearlyIncome, monthly: 50000.04 },
					properties: { occupancyRate: 95 },
				},
				error: null,
			})
			.mockResolvedValueOnce({
				data: {
					total_amount: totalExpenses,
					categories: [
						{ category: "maintenance", amount: 100000.13, percentage: 50 },
					],
				},
				error: null,
			});

		const { result } = renderHook(
			() =>
				useQuery(reportAnalyticsQueries.financial("2024-01-01", "2024-12-31")),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// magnitude preserved end-to-end: no /100 (would give 6000.005) or *100.
		expect(result.current.data?.summary?.totalIncome).toBe(yearlyIncome);
		expect(result.current.data?.summary?.totalExpenses).toBe(totalExpenses);
		expect(result.current.data?.summary?.netIncome).toBe(
			yearlyIncome - totalExpenses,
		);
		expect(result.current.data?.expenseBreakdown?.[0]?.amount).toBe(100000.13);
	});

	it("useYearEndSummary keeps rent received/expense/net and per-property amounts in dollars", async () => {
		const received = 500000.75;
		const expenses = 120000.5;
		answerYearEnd({
			collectedAt2024End: received + 1000.25,
			collectedAt2023End: 1000.25,
			expenses: { total_amount: expenses, categories: [] },
			properties: [
				{
					property_id: "p1",
					property_name: "Test",
					total_revenue: 250000.25,
					total_expenses: 60000.1,
					net_income: 190000.15,
					occupancy_rate: 95,
					timeframe: "2024-01-01/2024-12-31",
				},
			],
		});

		const { result } = renderHook(() => useYearEndSummary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const data = result.current.data;
		if (data?.status !== "ready") throw new Error("expected a summary");
		expect(data.summary.rentReceived).toBe(received);
		expect(data.summary.operatingExpenses).toBe(expenses);
		expect(data.summary.netIncome).toBe(380000.25);
		const prop = data.summary.byProperty[0];
		expect(prop?.rentReceived).toBe(250000.25);
		expect(prop?.expenses).toBe(60000.1);
		expect(prop?.netIncome).toBe(190000.15);
	});

	it("useReport1099Summary keeps vendor totalPaid and totalReported in dollars", async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				vendor_payments: [
					{ vendor_name: "Plumber Inc", total_paid: 15000.45, job_count: 5 },
					{ vendor_name: "Electrician LLC", total_paid: 8000.55, job_count: 3 },
				],
			},
			error: null,
		});

		const { result } = renderHook(() => useReport1099Summary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.recipients?.[0]?.totalPaid).toBe(15000.45);
		expect(result.current.data?.recipients?.[1]?.totalPaid).toBe(8000.55);
		// sum stays in dollars: 15000.45 + 8000.55 = 23001.00 (no cents drift).
		expect(result.current.data?.totalReported).toBe(23001);
	});

	it("reportAnalyticsQueries.properties keeps per-property rent received/expenses/net in dollars", async () => {
		mockRpc.mockResolvedValueOnce({
			data: [
				{
					property_id: "p1",
					property_name: "Maple Court",
					occupancy_rate: 90,
					total_revenue: 123456.78,
					total_expenses: 23456.12,
					net_income: 100000.66,
					timeframe: "2024-01-01/2024-12-31",
				},
			],
			error: null,
		});

		const { result } = renderHook(
			() =>
				useQuery(reportAnalyticsQueries.properties("2024-01-01", "2024-12-31")),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const prop = result.current.data?.byProperty?.[0];
		// magnitude preserved: no *100 (12345678) or /100 (1234.5678).
		expect(prop?.rentReceived).toBe(123456.78);
		expect(prop?.expenses).toBe(23456.12);
		expect(prop?.netIncome).toBe(100000.66);
	});
});
