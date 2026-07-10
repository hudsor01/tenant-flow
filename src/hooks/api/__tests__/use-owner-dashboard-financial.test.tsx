/**
 * Dashboard financial chart hook tests (TZ-03).
 *
 * Guards the two regressions the fix eradicates:
 *  1. Fake `expenses: 0` / `profit: revenue` (permanent 100% margin) — the
 *     queryFn now joins real per-month expenses from `get_expense_summary`.
 *  2. `7d`/`30d` collapsing to a single partial-month bucket — ranges are now
 *     month windows (`3m`/`6m`/`1y`) that yield distinct-length series.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type FinancialTimeRange,
	useFinancialChartData,
} from "../use-owner-dashboard-financial";

const { mockRpc, mockGetCachedUser } = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	mockGetCachedUser: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		rpc: mockRpc,
	}),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

// 12 months of revenue at a flat $10,000/mo so slice lengths are unambiguous.
const MONTHS = Array.from({ length: 12 }, (_, i) => {
	const month = String(i + 1).padStart(2, "0");
	return `2025-${month}`;
});

const REVENUE_ROWS = MONTHS.map((month) => ({
	month,
	revenue: 10000,
	collections: 10000,
	outstanding: 0,
}));

// Expenses for every month EXCEPT the last (2025-12) so the missing-month
// `?? 0` join branch is exercised. `total_amount` is deliberately huge to prove
// the mapper keys off `monthly_totals`, NOT the period scalar.
const EXPENSE_SUMMARY = {
	categories: [],
	monthly_totals: MONTHS.slice(0, 11).map((month) => ({ month, amount: 4000 })),
	total_amount: 9_999_999,
	monthly_average: 0,
	year_over_year_change: null,
};

/** Dispatch by RPC name — robust to Promise.all call order and repeat renders. */
function installRpcMock(overrides?: { revenue?: unknown; expense?: unknown }) {
	mockRpc.mockImplementation((fn: string) => {
		if (fn === "get_revenue_trends_optimized") {
			return Promise.resolve({
				data: overrides?.revenue ?? REVENUE_ROWS,
				error: null,
			});
		}
		if (fn === "get_expense_summary") {
			return Promise.resolve({
				data: overrides?.expense ?? EXPENSE_SUMMARY,
				error: null,
			});
		}
		return Promise.resolve({ data: null, error: null });
	});
}

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return createElement(
			QueryClientProvider,
			{ client: queryClient },
			children,
		);
	};
}

async function renderChart(range: FinancialTimeRange) {
	const { result } = renderHook(() => useFinancialChartData(range), {
		wrapper: createWrapper(),
	});
	await waitFor(() => expect(result.current.isSuccess).toBe(true));
	return result.current.data ?? [];
}

describe("useFinancialChartData (TZ-03)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
		installRpcMock();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("joins real per-month expenses instead of hardcoding 0", async () => {
		const data = await renderChart("6m");

		// Every month with a matching expense bucket carries the real value.
		const withExpense = data.filter((d) => d.date !== "2025-12");
		expect(withExpense.length).toBeGreaterThan(0);
		for (const point of withExpense) {
			expect(point.expenses).toBe(4000);
		}
	});

	it("derives profit as revenue - expenses per month", async () => {
		const data = await renderChart("6m");
		for (const point of data) {
			expect(point.profit).toBe(point.revenue - point.expenses);
		}
	});

	it("does not collapse the margin to 100% when expenses exist", async () => {
		const data = await renderChart("6m");
		const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
		const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
		const margin =
			totalRevenue > 0
				? ((totalRevenue - totalExpenses) / totalRevenue) * 100
				: 0;

		expect(totalExpenses).toBeGreaterThan(0);
		expect(margin).not.toBe(100);
		// 6 months revenue (60000) minus 5 months expense (20000; 2025-12 has none).
		expect(margin).toBeCloseTo(66.6667, 3);
	});

	it("keys expenses off monthly_totals, not the total_amount scalar", async () => {
		const data = await renderChart("6m");
		// If the mapper had used `total_amount` (9,999,999) no per-month value
		// would ever equal 4000 and the missing month would not be 0.
		expect(data.every((d) => d.expenses === 4000 || d.expenses === 0)).toBe(
			true,
		);
		expect(data.find((d) => d.date === "2025-12")?.expenses).toBe(0);
	});

	it("yields distinct-length bucket series per time range", async () => {
		const threeMonths = await renderChart("3m");
		const sixMonths = await renderChart("6m");
		const oneYear = await renderChart("1y");

		expect(threeMonths.length).toBe(3);
		expect(sixMonths.length).toBe(6);
		expect(oneYear.length).toBe(12);
		// Guards the old 7d/30d collapse where every range returned 1 bucket.
		expect(
			new Set([threeMonths.length, sixMonths.length, oneYear.length]).size,
		).toBe(3);
	});

	it("returns an empty series when there is no revenue data", async () => {
		installRpcMock({ revenue: [] });
		const data = await renderChart("6m");
		expect(data).toEqual([]);
	});
});
