/**
 * Expense Hooks Tests (Phase 6 TEST-03)
 *
 * Covers the page.data unwrap on useExpenses and the current-year default on
 * useTaxDocuments. (The create/delete expense mutation hooks this file also
 * covered were deleted with their factories: nothing in the app called them.)
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- hoisted mock fns referenced inside vi.mock (CLAUDE.md rule) ---
const { mockFrom, mockRpc, mockGetUser, mockGetCachedUser } = vi.hoisted(
	() => ({
		mockFrom: vi.fn(),
		mockRpc: vi.fn(),
		mockGetUser: vi.fn(),
		mockGetCachedUser: vi.fn(),
	}),
);

// Supabase client factory boundary — never reach into Supabase internals.
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		from: mockFrom,
		rpc: mockRpc,
		auth: {
			getUser: mockGetUser,
		},
	}),
}));

// Cached-user accessor used by financialTaxQueries.taxDocuments.
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

vi.mock("#lib/frontend-logger", () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	}),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { useExpenses, useTaxDocuments } from "../use-expense-mutations";

function renderWithClient<TReturn>(hook: () => TReturn): {
	result: { current: TReturn };
	queryClient: QueryClient;
} {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
		},
	});
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	const { result } = renderHook(hook, { wrapper });
	return { result, queryClient };
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("useExpenses select unwrap", () => {
	it("unwraps page.data so the hook returns the bare expense array", async () => {
		// expenseQueries.list queryFn: from→select→neq→order→limit, returns
		// { data, total }. The hook's select must surface only `data`.
		const orderChain = { limit: vi.fn() };
		const neqChain = { order: vi.fn().mockReturnValue(orderChain) };
		const selectChain = { neq: vi.fn().mockReturnValue(neqChain) };
		orderChain.limit.mockResolvedValue({
			data: [
				{ id: "exp-1", amount: 100.5, expense_date: "2024-01-01" },
				{ id: "exp-2", amount: 250.25, expense_date: "2024-02-01" },
			],
			count: null,
			error: null,
		});
		mockFrom.mockReturnValue({
			select: vi.fn().mockReturnValue(selectChain),
		});

		const { result } = renderWithClient(() => useExpenses());

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// page.data unwrapped: an ARRAY, not the { data, total } envelope.
		expect(Array.isArray(result.current.data)).toBe(true);
		expect(result.current.data).toHaveLength(2);
		expect(result.current.data?.[0]?.id).toBe("exp-1");
		// Dollar magnitude preserved through the read boundary — no cents math.
		expect(result.current.data?.[0]?.amount).toBe(100.5);
		// select() drops the { data, total } envelope: the bare array carries no
		// `total`. Had select been a no-op the hook would expose `total`.
		expect(Object.hasOwn(result.current.data ?? [], "total")).toBe(false);
	});
});

describe("useTaxDocuments default year", () => {
	it("defaults to the current calendar year when no taxYear is given", async () => {
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
		const currentYear = new Date().getFullYear();
		mockRpc.mockImplementation((fn: string, args: Record<string, unknown>) => {
			if (fn === "get_billing_insights") {
				// The ledger as of December 31 of the year, and of the year before.
				return Promise.resolve({
					data: {
						collectedTotal:
							args.end_date_param === `${currentYear}-12-31` ? 650000 : 50000,
					},
					error: null,
				});
			}
			// get_expense_summary
			return Promise.resolve({
				data: { total_amount: 200000, categories: [] },
				error: null,
			});
		});

		const { result } = renderWithClient(() => useTaxDocuments());

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const data = result.current.data;
		if (data?.status !== "ready") throw new Error("expected documents");
		expect(data.documents.taxYear).toBe(currentYear);
		expect(data.documents.period.label).toBe(`Tax Year ${currentYear}`);
		expect(data.documents.period.start_date).toBe(`${currentYear}-01-01`);
		// Dollar magnitude preserved: rent received / expenses pass through as-is.
		expect(data.documents.totals.totalIncome).toBe(600000);
		expect(data.documents.totals.totalExpenses).toBe(200000);
		expect(data.documents.totals.netIncome).toBe(400000);
	});

	it("honors an explicit taxYear over the current-year default", async () => {
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
		mockRpc.mockResolvedValue({ data: { unpaidTotal: 0 }, error: null });

		const { result } = renderWithClient(() => useTaxDocuments(2021));

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual({ status: "ledger-unavailable" });
		expect(mockRpc).toHaveBeenCalledWith("get_billing_insights", {
			owner_id_param: "user-1",
			end_date_param: "2021-12-31",
		});
	});
});
