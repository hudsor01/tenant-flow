/**
 * Expense Mutation Hooks Tests (DOLLAR hooks — Phase 6 TEST-03)
 *
 * Covers the cross-domain invalidation fan-out, the createMutationCallbacks
 * errorContext on the failure path, the page.data unwrap on useExpenses, the
 * current-year default on useTaxDocuments, and — the point of the phase —
 * DOLLAR CORRECTNESS: the amount the hook forwards into the mutation factory is
 * passed through UNCHANGED (no *100 / /100 cents conversion in this layer;
 * amounts are dollars numeric(10,2), cents live only at the Stripe boundary
 * which is NOT here).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- hoisted mock fns referenced inside vi.mock (CLAUDE.md rule) ---
const {
	mockFrom,
	mockRpc,
	mockGetUser,
	mockGetCachedUser,
	mockHandleMutationError,
	mockCreateExpense,
	mockDeleteExpense,
} = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockRpc: vi.fn(),
	mockGetUser: vi.fn(),
	mockGetCachedUser: vi.fn(),
	mockHandleMutationError: vi.fn(),
	mockCreateExpense: vi.fn(),
	mockDeleteExpense: vi.fn(),
}));

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

// Error-handler boundary — spy on the errorContext without firing Sentry/toast.
vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: mockHandleMutationError,
	handleMutationSuccess: vi.fn(),
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

// Mutation-factory boundary. Keep the real query-key factories
// (expenseKeys / expenseQueries / financialTaxQueries) and override ONLY
// financialMutations so we can capture the forwarded dollar amount and assert
// the invalidation fan-out without touching Supabase. mutationOptions threads
// the mutationKey/mutationFn straight through TanStack Query.
vi.mock("../query-keys/expense-keys", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../query-keys/expense-keys")>();
	return {
		...actual,
		financialMutations: {
			createExpense: () => ({
				mutationKey: ["expenses", "create"],
				mutationFn: mockCreateExpense,
			}),
			deleteExpense: () => ({
				mutationKey: ["expenses", "delete"],
				mutationFn: mockDeleteExpense,
			}),
		},
	};
});

import { expenseKeys } from "../query-keys/expense-keys";
import { financialKeys } from "../query-keys/financial-keys";
import { ownerDashboardKeys } from "../query-keys/owner-dashboard-keys";
import {
	useCreateExpenseMutation,
	useDeleteExpenseMutation,
	useExpenses,
	useTaxDocuments,
} from "../use-expense-mutations";

function renderWithClient<TReturn>(hook: () => TReturn): {
	result: { current: TReturn };
	queryClient: QueryClient;
} {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	const { result } = renderHook(hook, { wrapper });
	return { result, queryClient };
}

const EXPECTED_INVALIDATION_KEYS = [
	expenseKeys.all,
	financialKeys.all,
	ownerDashboardKeys.all,
];

beforeEach(() => {
	vi.clearAllMocks();
	mockCreateExpense.mockResolvedValue({
		id: "exp-new",
		amount: 1234.56,
		expense_date: "2024-12-25",
	});
	mockDeleteExpense.mockResolvedValue(undefined);
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

describe("useCreateExpenseMutation", () => {
	it("forwards the dollar amount UNCHANGED to the mutation factory (no cents conversion)", async () => {
		const input = {
			amount: 1234.56,
			expense_date: "2024-12-25",
			maintenance_request_id: "mr-1",
			vendor_name: "Austin Plumbing",
		};

		const { result } = renderWithClient(() => useCreateExpenseMutation());
		await result.current.mutateAsync(input);

		expect(mockCreateExpense).toHaveBeenCalledTimes(1);
		const forwarded = mockCreateExpense.mock.calls[0]?.[0] as {
			amount: number;
		};
		// The whole point: 1234.56 dollars in === 1234.56 dollars forwarded.
		// A *100 cents conversion would make this 123456.
		expect(forwarded.amount).toBe(1234.56);
		expect(forwarded).toMatchObject(input);
	});

	it("invalidates EXACTLY expenseKeys.all, financialKeys.all, ownerDashboardKeys.all on success", async () => {
		const { result, queryClient } = renderWithClient(() =>
			useCreateExpenseMutation(),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		await result.current.mutateAsync({
			amount: 42,
			expense_date: "2024-12-25",
			maintenance_request_id: "mr-1",
		});

		await waitFor(() => {
			expect(invalidateSpy).toHaveBeenCalledTimes(
				EXPECTED_INVALIDATION_KEYS.length,
			);
		});
		const invalidatedKeys = invalidateSpy.mock.calls.map(
			(call) => (call[0] as { queryKey: unknown }).queryKey,
		);
		for (const key of EXPECTED_INVALIDATION_KEYS) {
			expect(invalidatedKeys).toContainEqual(key);
		}
		expect(mockHandleMutationError).not.toHaveBeenCalled();
	});

	it("routes failures through createMutationCallbacks errorContext 'Create expense'", async () => {
		mockCreateExpense.mockRejectedValueOnce(new Error("insert failed"));

		const { result } = renderWithClient(() => useCreateExpenseMutation());

		await expect(
			result.current.mutateAsync({
				amount: 10,
				expense_date: "2024-12-25",
				maintenance_request_id: "mr-1",
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining("insert failed"),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockHandleMutationError).toHaveBeenCalledTimes(1);
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "insert failed" }),
			"Create expense",
		);
	});
});

describe("useDeleteExpenseMutation", () => {
	it("forwards the expense id UNCHANGED to the delete factory", async () => {
		const { result } = renderWithClient(() => useDeleteExpenseMutation());
		await result.current.mutateAsync("exp-77");

		expect(mockDeleteExpense).toHaveBeenCalledTimes(1);
		// TanStack Query threads a context object as the 2nd arg; assert the
		// payload (1st arg) is the id forwarded unchanged.
		expect(mockDeleteExpense.mock.calls[0]?.[0]).toBe("exp-77");
	});

	it("invalidates EXACTLY expenseKeys.all, financialKeys.all, ownerDashboardKeys.all on success", async () => {
		const { result, queryClient } = renderWithClient(() =>
			useDeleteExpenseMutation(),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		await result.current.mutateAsync("exp-1");

		await waitFor(() => {
			expect(invalidateSpy).toHaveBeenCalledTimes(
				EXPECTED_INVALIDATION_KEYS.length,
			);
		});
		const invalidatedKeys = invalidateSpy.mock.calls.map(
			(call) => (call[0] as { queryKey: unknown }).queryKey,
		);
		for (const key of EXPECTED_INVALIDATION_KEYS) {
			expect(invalidatedKeys).toContainEqual(key);
		}
		expect(mockHandleMutationError).not.toHaveBeenCalled();
	});

	it("routes failures through createMutationCallbacks errorContext 'Delete expense'", async () => {
		mockDeleteExpense.mockRejectedValueOnce(new Error("delete failed"));

		const { result } = renderWithClient(() => useDeleteExpenseMutation());

		await expect(result.current.mutateAsync("exp-1")).rejects.toMatchObject({
			message: expect.stringContaining("delete failed"),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockHandleMutationError).toHaveBeenCalledTimes(1);
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "delete failed" }),
			"Delete expense",
		);
	});
});

describe("financialMutations.createExpense mapper (dollar magnitude)", () => {
	it("inserts the dollar amount verbatim — no *100 cents conversion at the DB boundary", async () => {
		// Focused assertion against the REAL mapper (unmocked import alias).
		// Proves the dollar value is preserved end-to-end at the only place a
		// cents conversion could sneak in: the insert payload.
		const singleChain = {
			single: vi.fn().mockResolvedValue({
				data: { id: "exp-1", amount: 4999.99 },
				error: null,
			}),
		};
		const selectChain = { select: vi.fn().mockReturnValue(singleChain) };
		const insert = vi.fn().mockReturnValue(selectChain);
		mockFrom.mockReturnValue({ insert });

		// Pull the REAL (unmocked) mapper so a cents conversion at the DB
		// boundary would actually be exercised here.
		const actual = await vi.importActual<
			typeof import("../query-keys/expense-keys")
		>("../query-keys/expense-keys");
		const options = actual.financialMutations.createExpense();
		const { mutationFn } = options;
		if (!mutationFn) throw new Error("createExpense mutationFn is undefined");
		await mutationFn(
			{
				amount: 4999.99,
				expense_date: "2024-12-25",
				maintenance_request_id: "mr-1",
				vendor_name: "HVAC Co",
			},
			{ client: new QueryClient(), meta: undefined },
		);

		expect(insert).toHaveBeenCalledTimes(1);
		const payload = insert.mock.calls[0]?.[0] as { amount: number };
		expect(payload.amount).toBe(4999.99);
	});

	it("strips an undefined vendor_name from the insert payload (omitUndefined lets Postgres apply the column DEFAULT)", async () => {
		// Real mapper again — omitUndefined() must drop optional undefined fields
		// so the insert key is ABSENT (DB DEFAULT), not present-as-undefined.
		const singleChain = {
			single: vi.fn().mockResolvedValue({
				data: { id: "exp-2", amount: 12.34 },
				error: null,
			}),
		};
		const selectChain = { select: vi.fn().mockReturnValue(singleChain) };
		const insert = vi.fn().mockReturnValue(selectChain);
		mockFrom.mockReturnValue({ insert });

		const actual = await vi.importActual<
			typeof import("../query-keys/expense-keys")
		>("../query-keys/expense-keys");
		const { mutationFn } = actual.financialMutations.createExpense();
		if (!mutationFn) throw new Error("createExpense mutationFn is undefined");
		await mutationFn(
			{
				amount: 12.34,
				expense_date: "2024-12-25",
				maintenance_request_id: "mr-1",
				// vendor_name intentionally omitted
			},
			{ client: new QueryClient(), meta: undefined },
		);

		expect(insert).toHaveBeenCalledTimes(1);
		const payload = insert.mock.calls[0]?.[0] as Record<string, unknown>;
		// Present required fields stay; absent optional field is stripped entirely.
		expect(payload.amount).toBe(12.34);
		expect(payload.maintenance_request_id).toBe("mr-1");
		expect(Object.hasOwn(payload, "vendor_name")).toBe(false);
	});
});

describe("financialMutations.deleteExpense mapper (soft-delete)", () => {
	it("SOFT-deletes via update({status:'inactive'}).eq('id', id) — never a hard .delete()", async () => {
		// Real (unmocked) mapper. A regression that swapped soft-delete for a
		// hard .delete() (data-loss / lost financial trail) would pass every
		// hook-level test green because those mock financialMutations — this is
		// the only assertion that pins the soft-delete contract.
		const eq = vi.fn().mockResolvedValue({ error: null });
		const update = vi.fn().mockReturnValue({ eq });
		const hardDelete = vi.fn();
		mockFrom.mockReturnValue({ update, delete: hardDelete });

		const actual = await vi.importActual<
			typeof import("../query-keys/expense-keys")
		>("../query-keys/expense-keys");
		const { mutationFn } = actual.financialMutations.deleteExpense();
		if (!mutationFn) throw new Error("deleteExpense mutationFn is undefined");
		await mutationFn("exp-soft", {
			client: new QueryClient(),
			meta: undefined,
		});

		expect(mockFrom).toHaveBeenCalledWith("expenses");
		// Soft-delete: status flipped to inactive, scoped to the id.
		expect(update).toHaveBeenCalledTimes(1);
		expect(update).toHaveBeenCalledWith({ status: "inactive" });
		expect(eq).toHaveBeenCalledWith("id", "exp-soft");
		// And crucially NOT a hard delete.
		expect(hardDelete).not.toHaveBeenCalled();
	});
});

describe("useTaxDocuments default year", () => {
	it("defaults to the current calendar year when no taxYear is given", async () => {
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
		mockRpc.mockImplementation((fn: string) => {
			if (fn === "get_dashboard_stats") {
				return Promise.resolve({
					data: { revenue: { yearly: 600000 } },
					error: null,
				});
			}
			// get_expense_summary
			return Promise.resolve({
				data: { total_amount: 200000, categories: [] },
				error: null,
			});
		});

		const currentYear = new Date().getFullYear();
		const { result } = renderWithClient(() => useTaxDocuments());

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data?.taxYear).toBe(currentYear);
		expect(result.current.data?.period.label).toBe(`Tax Year ${currentYear}`);
		expect(result.current.data?.period.start_date).toBe(`${currentYear}-01-01`);
		// Dollar magnitude preserved: yearly income / expenses pass through as-is.
		expect(result.current.data?.totals.totalIncome).toBe(600000);
		expect(result.current.data?.totals.totalDeductions).toBe(200000);
		expect(result.current.data?.totals.netTaxableIncome).toBe(400000);
	});

	it("honors an explicit taxYear over the current-year default", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderWithClient(() => useTaxDocuments(2021));

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data?.taxYear).toBe(2021);
		expect(result.current.data?.period.label).toBe("Tax Year 2021");
	});
});
