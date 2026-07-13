/**
 * Financial Overview Hooks Tests
 *
 * Validates useFinancialOverview, useMonthlyMetrics, useExpenseSummary
 * using Supabase RPC mocks. Financial queries use real RPCs via financial-keys.ts.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	useExpenseSummary,
	useFinancialOverview,
	useMonthlyMetrics,
} from "../use-financials";

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
		},
	}),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
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

describe("useFinancialOverview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches financial overview data successfully", async () => {
		// overview() calls get_dashboard_stats + get_expense_summary in parallel
		mockRpc
			.mockResolvedValueOnce({
				data: {
					revenue: { yearly: 500000, monthly: 41667 },
					properties: { occupancyRate: 94 },
				},
				error: null,
			})
			.mockResolvedValueOnce({
				data: { total_amount: 120000 },
				error: null,
			});

		const { result } = renderHook(() => useFinancialOverview(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.overview?.total_revenue).toBe(500000);
		expect(result.current.data?.overview?.total_expenses).toBe(120000);
		expect(result.current.data?.overview?.net_income).toBe(380000);
		expect(result.current.data?.overview?.accounts_receivable).toBe(41667);
		expect(result.current.data?.highlights?.length).toBe(3);
		expect(mockRpc).toHaveBeenCalledWith("get_dashboard_stats", {
			p_user_id: "user-1",
		});
		expect(mockRpc).toHaveBeenCalledWith("get_expense_summary", {
			p_user_id: "user-1",
		});
	});

	it("handles error state", async () => {
		mockRpc.mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useFinancialOverview(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	it("surfaces an expense-RPC error instead of silently zeroing expenses (BILL-04)", async () => {
		// get_dashboard_stats succeeds but get_expense_summary fails. Without the
		// expenseResult.error check this would resolve with total_expenses: 0 and
		// overstate net income; it must reject instead.
		mockRpc
			.mockResolvedValueOnce({
				data: {
					revenue: { yearly: 500000, monthly: 41667 },
					properties: { occupancyRate: 94 },
				},
				error: null,
			})
			.mockResolvedValueOnce({
				data: null,
				error: { message: "expense summary failed", code: "500" },
			});

		const { result } = renderHook(() => useFinancialOverview(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.data).toBeUndefined();
	});
});

describe("useMonthlyMetrics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	it("fetches monthly metrics data successfully", async () => {
		// useMonthlyMetrics now fires TWO RPCs via fetchRevenueWithExpenses:
		// get_revenue_trends_optimized (revenue-only, real key `revenue`) then
		// get_expense_summary (per-month expenses via monthly_totals). expenses/
		// net_income/cash_flow come from the join, not phantom RPC keys (TYPE-05).
		mockRpc
			.mockResolvedValueOnce({
				data: [
					{ month: "2024-01", revenue: 40000 },
					{ month: "2024-02", revenue: 42000 },
					{ month: "2024-03", revenue: 43000 },
				],
				error: null,
			})
			.mockResolvedValueOnce({
				data: {
					monthly_totals: [
						{ month: "2024-01", amount: 10000 },
						{ month: "2024-02", amount: 11000 },
						{ month: "2024-03", amount: 10500 },
					],
				},
				error: null,
			});

		const { result } = renderHook(() => useMonthlyMetrics(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.length).toBe(3);
		expect(result.current.data?.[0]?.month).toBe("2024-01");
		expect(result.current.data?.[0]?.revenue).toBe(40000);
		expect(result.current.data?.[0]?.expenses).toBe(10000);
		// cash_flow = revenue - joined expenses = 40000 - 10000.
		expect(result.current.data?.[0]?.cash_flow).toBe(30000);
	});

	it("returns empty array when no data", async () => {
		// Promise.all fires the expense RPC unconditionally even for empty
		// revenue, so BOTH must be mocked (TYPE-05).
		mockRpc
			.mockResolvedValueOnce({ data: [], error: null })
			.mockResolvedValueOnce({ data: { monthly_totals: [] }, error: null });

		const { result } = renderHook(() => useMonthlyMetrics(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});
});

describe("useExpenseSummary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	it("fetches expense summary with category breakdown", async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				categories: [
					{ category: "maintenance", amount: 50000, percentage: 40 },
					{ category: "utilities", amount: 25000, percentage: 20 },
					{ category: "insurance", amount: 25000, percentage: 20 },
					{ category: "other", amount: 25000, percentage: 20 },
				],
				monthly_totals: [
					{ month: "2024-01", amount: 10000 },
					{ month: "2024-02", amount: 11000 },
					{ month: "2024-03", amount: 10500 },
				],
				total_amount: 125000,
				monthly_average: 10416,
				year_over_year_change: -5.2,
			},
			error: null,
		});

		const { result } = renderHook(() => useExpenseSummary(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.categories?.length).toBe(4);
		expect(result.current.data?.total_amount).toBe(125000);
		expect(result.current.data?.year_over_year_change).toBe(-5.2);
	});
});
