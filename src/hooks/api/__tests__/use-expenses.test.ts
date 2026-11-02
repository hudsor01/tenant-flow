/**
 * Expenses Hooks Tests
 *
 * Tests expense hooks using Supabase mock (migrated from NestJS apiRequest in Phase 53).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expenseKeys } from "../query-keys/expense-keys";
import { useExpenses } from "../use-expense-mutations";

// Supabase mock using vi.hoisted() to avoid initialization errors
const { mockFrom, mockSelect, mockNeq, mockOrder, mockLimit } = vi.hoisted(
	() => ({
		mockFrom: vi.fn(),
		mockSelect: vi.fn(),
		mockNeq: vi.fn(),
		mockOrder: vi.fn(),
		mockLimit: vi.fn(),
	}),
);

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		from: mockFrom,
	}),
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
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

const mockExpenseRow = {
	id: "exp-1",
	amount: 125000,
	expense_date: "2024-12-20",
	vendor_name: "Austin Plumbing",
	maintenance_request_id: null,
	status: "active",
	created_at: "2024-12-20T00:00:00Z",
};

describe("expenseKeys", () => {
	it("generates correct query keys", () => {
		expect(expenseKeys.all).toEqual(["expenses"]);
		expect(expenseKeys.list()).toEqual(["expenses", "list"]);
	});
});

describe("useExpenses", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches all expenses successfully", async () => {
		const selectChain = { neq: mockNeq };
		const neqChain = { order: mockOrder };
		const orderChain = { limit: mockLimit };
		mockSelect.mockReturnValue(selectChain);
		mockNeq.mockReturnValue(neqChain);
		mockOrder.mockReturnValue(orderChain);
		// useExpenses applies the default 1000-row ceiling — chain ends in .limit()
		mockLimit.mockResolvedValue({
			data: [
				mockExpenseRow,
				{ ...mockExpenseRow, id: "exp-2", vendor_name: "Cool Air Services" },
			],
			count: null,
			error: null,
		});
		mockFrom.mockReturnValue({ select: mockSelect });

		const { result } = renderHook(() => useExpenses(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.length).toBe(2);
		expect(mockFrom).toHaveBeenCalledWith("expenses");
		expect(mockNeq).toHaveBeenCalledWith("status", "inactive");
		expect(mockLimit).toHaveBeenCalledWith(1000);
	});

	it("derives property_name from the maintenance_requests join and maps description (TYPE-04)", async () => {
		mockSelect.mockReturnValue({ neq: mockNeq });
		mockNeq.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ limit: mockLimit });
		mockLimit.mockResolvedValue({
			data: [
				{
					...mockExpenseRow,
					description: "HVAC repair",
					maintenance_requests: {
						units: { properties: { name: "Maple Court" } },
					},
				},
				// No maintenance link → property_name must be null, not "--".
				{ ...mockExpenseRow, id: "exp-2", maintenance_requests: null },
			],
			count: null,
			error: null,
		});
		mockFrom.mockReturnValue({ select: mockSelect });

		const { result } = renderHook(() => useExpenses(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.[0]?.property_name).toBe("Maple Court");
		expect(result.current.data?.[0]?.description).toBe("HVAC repair");
		expect(result.current.data?.[1]?.property_name).toBeNull();
	});

	it("handles empty expense list", async () => {
		const selectChain = { neq: mockNeq };
		const neqChain = { order: mockOrder };
		const orderChain = { limit: mockLimit };
		mockSelect.mockReturnValue(selectChain);
		mockNeq.mockReturnValue(neqChain);
		mockOrder.mockReturnValue(orderChain);
		mockLimit.mockResolvedValue({ data: [], count: null, error: null });
		mockFrom.mockReturnValue({ select: mockSelect });

		const { result } = renderHook(() => useExpenses(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual([]);
	});

	it("respects enabled option", () => {
		const { result } = renderHook(() => useExpenses({ enabled: false }), {
			wrapper: createWrapper(),
		});

		// Should not fetch when disabled
		expect(result.current.isFetching).toBe(false);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});
