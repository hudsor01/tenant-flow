/**
 * Reports Hooks Tests
 *
 * Tests report hooks that query real Supabase tables (reports, report_runs)
 * and RPCs (get_revenue_trends_optimized, get_billing_insights, etc.).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	reportsKeys,
	useFinancialReport,
	useMaintenanceReport,
	useMonthlyRevenue,
	useOccupancyMetrics,
	usePaymentAnalytics,
	usePropertyReport,
	useReport1099Summary,
	useTenantReport,
	useYearEndSummary,
} from "../use-reports";

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

describe("reportsKeys", () => {
	it("generates correct query keys", () => {
		expect(reportsKeys.all).toEqual(["reports"]);
		expect(reportsKeys.lists()).toEqual(["reports", "list"]);
		expect(reportsKeys.list(0, 20)).toEqual(["reports", "list", 0, 20]);
		expect(reportsKeys.revenue(12)).toEqual([
			"reports",
			"revenue",
			"monthly",
			12,
		]);
		expect(reportsKeys.paymentAnalytics("2024-01-01", "2024-12-31")).toEqual([
			"reports",
			"analytics",
			"payments",
			"2024-01-01",
			"2024-12-31",
		]);
		expect(reportsKeys.occupancyMetrics()).toEqual([
			"reports",
			"analytics",
			"occupancy",
		]);
		expect(reportsKeys.financial("2024-01-01", "2024-12-31")).toEqual([
			"reports",
			"financial",
			"2024-01-01",
			"2024-12-31",
		]);
		expect(reportsKeys.yearEnd(2024)).toEqual(["reports", "year-end", 2024]);
		expect(reportsKeys.report1099(2024)).toEqual(["reports", "1099", 2024]);
	});
});

describe("useMonthlyRevenue", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches monthly revenue data from get_revenue_trends_optimized", async () => {
		// The RPC returns rows with revenue/expenses/profit (or net_income) keys
		mockRpc.mockResolvedValueOnce({
			data: [
				{
					month: "2024-01",
					revenue: 40000,
					expenses: 10000,
					net_income: 30000,
					property_count: 3,
				},
				{
					month: "2024-02",
					revenue: 42000,
					expenses: 11000,
					net_income: 31000,
					property_count: 3,
				},
			],
			error: null,
		});

		const { result } = renderHook(() => useMonthlyRevenue(12), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.length).toBe(2);
		expect(result.current.data?.[0]?.month).toBe("2024-01");
		expect(result.current.data?.[0]?.revenue).toBe(40000);
		expect(result.current.data?.[0]?.expenses).toBe(10000);
		expect(result.current.data?.[0]?.profit).toBe(30000);
		expect(result.current.data?.[0]?.propertyCount).toBe(3);
		expect(mockRpc).toHaveBeenCalledWith("get_revenue_trends_optimized", {
			p_user_id: "user-1",
			p_months: 12,
		});
	});

	it("returns empty array when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(() => useMonthlyRevenue(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});

describe("usePaymentAnalytics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches payment analytics from get_billing_insights", async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				total_payments: 50,
				successful_payments: 48,
				failed_payments: 2,
				total_revenue: 250000,
				average_payment: 5000,
				by_method: { card: 30, ach: 20 },
				by_status: { completed: 48, pending: 0, failed: 2 },
			},
			error: null,
		});

		const { result } = renderHook(
			() => usePaymentAnalytics("2024-01-01", "2024-12-31"),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.totalRevenue).toBeDefined();
		expect(mockRpc).toHaveBeenCalledWith(
			"get_billing_insights",
			expect.objectContaining({
				owner_id_param: "user-1",
			}),
		);
	});

	it("returns defaults when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(() => usePaymentAnalytics(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.totalPayments).toBe(0);
		expect(result.current.data?.totalRevenue).toBe(0);
	});
});

describe("useOccupancyMetrics", () => {
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

		const { result } = renderHook(() => useOccupancyMetrics(), {
			wrapper: createWrapper(),
		});

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

		const { result } = renderHook(() => useOccupancyMetrics(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.totalUnits).toBe(0);
		expect(result.current.data?.occupancyRate).toBe(0);
	});
});

describe("useFinancialReport", () => {
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
				data: [
					{
						revenue: { yearly: 600000, monthly: 50000 },
						units: { occupancy_rate: 95 },
					},
				],
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
			() => useFinancialReport("2024-01-01", "2024-12-31"),
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

describe("useMaintenanceReport", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches maintenance analytics", async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				total_requests: 25,
				open_requests: 3,
				avg_resolution_hours: 48,
				total_cost: 15000,
				average_cost: 600,
				by_status: [{ status: "open", count: 3 }],
				by_priority: [{ priority: "high", count: 5 }],
				monthly_cost: [{ month: "2024-01", cost: 2000 }],
				vendor_performance: [
					{ vendor_name: "Test Vendor", total_spend: 5000, jobs: 10 },
				],
			},
			error: null,
		});

		const { result } = renderHook(() => useMaintenanceReport(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.summary?.totalRequests).toBe(25);
		expect(result.current.data?.summary?.openRequests).toBe(3);
		expect(result.current.data?.vendorPerformance?.length).toBe(1);
		expect(mockRpc).toHaveBeenCalledWith("get_maintenance_analytics", {
			user_id: "user-1",
		});
	});
});

describe("useYearEndSummary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches year-end summary from parallel RPCs", async () => {
		// yearEnd() calls get_dashboard_stats + get_expense_summary + get_property_performance_analytics
		mockRpc
			.mockResolvedValueOnce({
				data: [{ revenue: { yearly: 500000, monthly: 41667 }, units: {} }],
				error: null,
			})
			.mockResolvedValueOnce({
				data: { total_amount: 120000, categories: [] },
				error: null,
			})
			.mockResolvedValueOnce({
				data: [
					{
						property_id: "p1",
						property_name: "Test",
						total_revenue: 500000,
						total_expenses: 120000,
						net_income: 380000,
						occupancy_rate: 95,
						timeframe: "2024",
					},
				],
				error: null,
			});

		const { result } = renderHook(() => useYearEndSummary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.year).toBe(2024);
		expect(result.current.data?.grossRentalIncome).toBe(500000);
		expect(result.current.data?.operatingExpenses).toBe(120000);
		expect(result.current.data?.netIncome).toBe(380000);
	});
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

describe("usePropertyReport", () => {
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
					timeframe: "2024",
				},
				{
					property_id: "p2",
					property_name: "Oak Villa",
					occupancy_rate: 100,
					total_revenue: 80000,
					total_expenses: 20000,
					net_income: 60000,
					timeframe: "2024",
				},
			],
			error: null,
		});

		const { result } = renderHook(
			() => usePropertyReport("2024-01-01", "2024-12-31"),
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
		expect(mockRpc).toHaveBeenCalledWith("get_property_performance_analytics", {
			p_user_id: "user-1",
		});
	});

	it("returns defaults when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(() => usePropertyReport(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.summary?.totalProperties).toBe(0);
		expect(result.current.data?.byProperty).toEqual([]);
		expect(mockRpc).not.toHaveBeenCalled();
	});
});

describe("useTenantReport", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches tenant report from get_dashboard_stats + occupancy trends", async () => {
		// tenants() runs get_dashboard_stats + fetchOccupancyTrends in parallel.
		mockRpc
			.mockResolvedValueOnce({
				data: [
					{
						tenants: { total: 12 },
						leases: { active: 9, expiring_soon: 2 },
					},
				],
				error: null,
			})
			// DATA-01: get_occupancy_trends_optimized returns a jsonb ARRAY
			// (jsonArrayOrEmpty throws on an object). The tenant report has no
			// real source for turnover / on-time-payment, so both stay 0.
			.mockResolvedValueOnce({
				data: [
					{
						month: "2024-01",
						occupancy_rate: 90,
						total_units: 20,
						occupied_units: 18,
					},
				],
				error: null,
			});

		const { result } = renderHook(
			() => useTenantReport("2024-01-01", "2024-12-31"),
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

		const { result } = renderHook(() => useTenantReport(), {
			wrapper: createWrapper(),
		});

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

describe("useMonthlyRevenue (error paths)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_revenue_trends_optimized RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(() => useMonthlyRevenue(12), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});

	it("surfaces isError when getCachedUser rejects", async () => {
		mockGetCachedUser.mockRejectedValueOnce(new Error("session lookup failed"));

		const { result } = renderHook(() => useMonthlyRevenue(12), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toMatchObject({
			message: expect.stringContaining("session lookup failed"),
		});
		expect(mockRpc).not.toHaveBeenCalled();
	});
});

describe("usePaymentAnalytics (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_billing_insights RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(
			() => usePaymentAnalytics("2024-01-01", "2024-12-31"),
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

describe("useOccupancyMetrics (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_occupancy_trends_optimized RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(() => useOccupancyMetrics(), {
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

describe("useFinancialReport (error path)", () => {
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
			() => useFinancialReport("2024-01-01", "2024-12-31"),
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

describe("useMaintenanceReport (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_maintenance_analytics RPC errors", async () => {
		mockRpc.mockResolvedValueOnce({ data: null, error: postgrestError });

		const { result } = renderHook(() => useMaintenanceReport(), {
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

describe("usePropertyReport (error path)", () => {
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
			() => usePropertyReport("2024-01-01", "2024-12-31"),
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

describe("useTenantReport (error path)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("surfaces isError when get_dashboard_stats RPC errors", async () => {
		// tenants() runs get_dashboard_stats + fetchOccupancyTrends in parallel;
		// dashResult.error must propagate through handlePostgrestError.
		mockRpc
			.mockResolvedValueOnce({ data: null, error: postgrestError })
			// DATA-01: occupancy fetch now returns an ARRAY (jsonArrayOrEmpty
			// throws on an object) — mock [] so the dashboard error surfaces.
			.mockResolvedValueOnce({ data: [], error: null });

		const { result } = renderHook(() => useTenantReport(), {
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

	it("useMonthlyRevenue forwards revenue/expenses/profit as dollars (no cents math)", async () => {
		// 12345.67 dollars: *100 would yield 1234567, /100 would yield 123.4567.
		mockRpc.mockResolvedValueOnce({
			data: [
				{
					month: "2024-03",
					revenue: 12345.67,
					expenses: 2345.89,
					net_income: 9999.78,
					property_count: 4,
				},
			],
			error: null,
		});

		const { result } = renderHook(() => useMonthlyRevenue(12), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const row = result.current.data?.[0];
		expect(row?.revenue).toBe(12345.67);
		expect(row?.expenses).toBe(2345.89);
		expect(row?.profit).toBe(9999.78);
	});

	it("usePaymentAnalytics forwards totalRevenue/averagePayment as dollars", async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				total_payments: 7,
				successful_payments: 7,
				failed_payments: 0,
				total_revenue: 87654.32,
				average_payment: 12522.04,
				payments_by_method: { card: 5, ach: 2 },
				payments_by_status: { completed: 7, pending: 0, failed: 0 },
			},
			error: null,
		});

		const { result } = renderHook(
			() => usePaymentAnalytics("2024-01-01", "2024-12-31"),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.totalRevenue).toBe(87654.32);
		expect(result.current.data?.averagePayment).toBe(12522.04);
	});

	it("useFinancialReport keeps dollar income/expense/netIncome arithmetic in dollars", async () => {
		const yearlyIncome = 600000.5;
		const totalExpenses = 200000.25;
		mockRpc
			.mockResolvedValueOnce({
				data: [
					{
						revenue: { yearly: yearlyIncome, monthly: 50000.04 },
						units: { occupancy_rate: 95 },
					},
				],
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
			() => useFinancialReport("2024-01-01", "2024-12-31"),
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

	it("useYearEndSummary keeps gross/expense/net and per-property amounts in dollars", async () => {
		const gross = 500000.75;
		const expenses = 120000.5;
		mockRpc
			.mockResolvedValueOnce({
				data: [{ revenue: { yearly: gross, monthly: 41666.73 }, units: {} }],
				error: null,
			})
			.mockResolvedValueOnce({
				data: { total_amount: expenses, categories: [] },
				error: null,
			})
			.mockResolvedValueOnce({
				data: [
					{
						property_id: "p1",
						property_name: "Test",
						total_revenue: 250000.25,
						total_expenses: 60000.1,
						net_income: 190000.15,
						occupancy_rate: 95,
						timeframe: "2024",
					},
				],
				error: null,
			});

		const { result } = renderHook(() => useYearEndSummary(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.grossRentalIncome).toBe(gross);
		expect(result.current.data?.operatingExpenses).toBe(expenses);
		expect(result.current.data?.netIncome).toBe(gross - expenses);
		const prop = result.current.data?.byProperty?.[0];
		expect(prop?.income).toBe(250000.25);
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

	it("usePropertyReport keeps per-property revenue/expenses/net in dollars", async () => {
		mockRpc.mockResolvedValueOnce({
			data: [
				{
					property_id: "p1",
					property_name: "Maple Court",
					occupancy_rate: 90,
					total_revenue: 123456.78,
					total_expenses: 23456.12,
					net_income: 100000.66,
					timeframe: "2024",
				},
			],
			error: null,
		});

		const { result } = renderHook(
			() => usePropertyReport("2024-01-01", "2024-12-31"),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const prop = result.current.data?.byProperty?.[0];
		// magnitude preserved: no *100 (12345678) or /100 (1234.5678).
		expect(prop?.revenue).toBe(123456.78);
		expect(prop?.expenses).toBe(23456.12);
		expect(prop?.netOperatingIncome).toBe(100000.66);
	});
});
