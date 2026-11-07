/**
 * Financial Overview Hooks Tests
 *
 * Validates useExpenseSummary using Supabase RPC mocks. Financial queries use real RPCs via financial-keys.ts.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExpenseSummary } from "../use-financials";

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
		// No prior period: the body before 20261102184502, whose change is no
		// figure (production's is the literal null). The snake_case key is not
		// passed through either.
		expect(result.current.data?.yearOverYear).toEqual({
			status: "unavailable",
		});
		expect(result.current.data).not.toHaveProperty("year_over_year_change");
	});

	it("reads the year over year beside the prior period it compares with", async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				categories: [],
				monthly_totals: [],
				total_amount: 320,
				monthly_average: 26.67,
				year_over_year_change: 33.33,
				year_over_year_prior_period: "2025-01-01/2025-11-02",
			},
			error: null,
		});
		const { result } = renderHook(() => useExpenseSummary(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(result.current.data?.yearOverYear).toEqual({
			status: "ready",
			change: 33.33,
			priorPeriod: { start_date: "2025-01-01", end_date: "2025-11-02" },
		});
	});

	it("keeps no prior-year expenses as no figure, not 0%", async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				categories: [],
				monthly_totals: [],
				total_amount: 7,
				monthly_average: 0,
				year_over_year_change: null,
				year_over_year_prior_period: "2023-02-28/2023-02-28",
			},
			error: null,
		});
		const { result } = renderHook(() => useExpenseSummary(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(result.current.data?.yearOverYear).toEqual({
			status: "ready",
			change: null,
			priorPeriod: { start_date: "2023-02-28", end_date: "2023-02-28" },
		});
	});
});
