/**
 * Financial Statement Hooks Tests
 *
 * Tests useIncomeStatement, useCashFlow, useBalanceSheet, useTaxDocuments
 * using Supabase RPC mocks. These hooks delegate to financial-keys.ts, which
 * calls get_dashboard_stats, get_expense_summary and get_billing_insights.
 *
 * Note: useExpenseSummary is tested in use-financial-overview.test.ts.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expenseKeys } from "../query-keys/expense-keys";
import { financialKeys } from "../query-keys/financial-keys";
import { useTaxDocuments } from "../use-expense-mutations";
import {
	useBalanceSheet,
	useCashFlow,
	useIncomeStatement,
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

describe("financialKeys", () => {
	it("generates correct query keys", () => {
		expect(financialKeys.all).toEqual(["financials"]);
		expect(financialKeys.expenseSummary()).toEqual([
			"financials",
			"expense-summary",
		]);
		expect(
			financialKeys.incomeStatement({
				start_date: "2024-01-01",
				end_date: "2024-12-31",
			}),
		).toEqual([
			"financials",
			"income-statement",
			{ start_date: "2024-01-01", end_date: "2024-12-31" },
		]);
		expect(
			financialKeys.cashFlow({
				start_date: "2024-01-01",
				end_date: "2024-12-31",
			}),
		).toEqual([
			"financials",
			"cash-flow",
			{ start_date: "2024-01-01", end_date: "2024-12-31" },
		]);
		expect(financialKeys.balanceSheet("2024-12-31")).toEqual([
			"financials",
			"balance-sheet",
			"2024-12-31",
		]);
	});
});

describe("expenseKeys", () => {
	it("generates correct query keys", () => {
		expect(expenseKeys.all).toEqual(["expenses"]);
		expect(expenseKeys.list()).toEqual(["expenses", "list"]);
	});
});

describe("useIncomeStatement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches income statement from parallel RPCs", async () => {
		// incomeStatement() calls get_dashboard_stats + get_expense_summary in parallel
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

		const { result } = renderHook(
			() =>
				useIncomeStatement({
					start_date: "2024-01-01",
					end_date: "2024-12-31",
				}),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const data = result.current.data;
		expect(data?.success).toBe(true);
		expect(data?.data?.revenue?.totalRevenue).toBe(500000);
		expect(data?.data?.expenses?.totalExpenses).toBe(120000);
		expect(data?.data?.netIncome).toBe(380000);
		expect(data?.data?.profitMargin).toBeCloseTo(76);
		expect(mockRpc).toHaveBeenCalledWith("get_dashboard_stats", {
			p_user_id: "user-1",
		});
		// BILL-02: incomeStatement forwards the selected range to the now
		// date-aware get_expense_summary (revenue side stays annualized MRR).
		expect(mockRpc).toHaveBeenCalledWith("get_expense_summary", {
			p_user_id: "user-1",
			p_start_date: "2024-01-01",
			p_end_date: "2024-12-31",
		});
	});

	it("handles no user gracefully", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(
			() =>
				useIncomeStatement({
					start_date: "2024-01-01",
					end_date: "2024-12-31",
				}),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.data?.revenue?.totalRevenue).toBe(0);
		expect(result.current.data?.data?.netIncome).toBe(0);
	});
});

describe("useCashFlow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches cash flow from parallel RPCs", async () => {
		mockRpc
			.mockResolvedValueOnce({
				data: { revenue: { yearly: 500000, monthly: 41667 }, units: {} },
				error: null,
			})
			.mockResolvedValueOnce({
				data: { monthly_average: 10000 },
				error: null,
			});

		const { result } = renderHook(
			() => useCashFlow({ start_date: "2024-01-01", end_date: "2024-12-31" }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const data = result.current.data;
		expect(data?.success).toBe(true);
		expect(data?.data?.operatingActivities?.rentalPaymentsReceived).toBe(41667);
		expect(data?.data?.operatingActivities?.operatingExpensesPaid).toBe(10000);
		expect(data?.data?.netCashFlow).toBe(31667);
	});
});

describe("useBalanceSheet", () => {
	/** get_billing_insights' ledger figures for one as-of date (20261102055449). */
	function ledger(figures: {
		collectedTotal: number;
		unpaidTotal: number;
		creditBalanceTotal: number;
		chargedTotal: number;
		openingTotal: number;
	}) {
		// The scheduled-rent keys ride along and must reach no line of the sheet.
		return { totalRevenue: 999999, mrr: 83333.25, tenantCount: 3, ...figures };
	}

	/** Answer each RPC by name and arguments, as production would. */
	function answer(answers: {
		asOf: unknown;
		atYearStart: unknown;
		expensesThisYear: unknown;
		expensesBefore: unknown;
	}) {
		mockRpc.mockImplementation(
			async (fn: string, args: Record<string, unknown>) => {
				if (fn === "get_billing_insights") {
					return {
						data:
							args.end_date_param === "2026-03-31"
								? answers.asOf
								: answers.atYearStart,
						error: null,
					};
				}
				if (fn === "get_expense_summary") {
					return {
						data:
							args.p_start_date === "2026-01-01"
								? answers.expensesThisYear
								: answers.expensesBefore,
						error: null,
					};
				}
				return { data: { revenue: { yearly: 999999 } }, error: null };
			},
		);
	}

	async function load(asOfDate = "2026-03-31") {
		const { result } = renderHook(() => useBalanceSheet(asOfDate), {
			wrapper: createWrapper(),
		});
		await waitFor(() => {
			expect(result.current.isSuccess || result.current.isError).toBe(true);
		});
		return result.current;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("reads Cash and Accounts Receivable from the ledger as of the date", async () => {
		answer({
			asOf: ledger({
				collectedTotal: 4515,
				unpaidTotal: 145.5,
				creditBalanceTotal: 500,
				chargedTotal: 4160.5,
				openingTotal: 300,
			}),
			atYearStart: ledger({
				collectedTotal: 900,
				unpaidTotal: 250,
				creditBalanceTotal: 0,
				chargedTotal: 1150,
				openingTotal: 200,
			}),
			expensesThisYear: { total_amount: 1200 },
			expensesBefore: { total_amount: 99.99 },
		});

		const query = await load();
		expect(query.isSuccess).toBe(true);
		const result = query.data;
		if (result?.status !== "ready") throw new Error("expected a sheet");
		const { assets, liabilities, equity } = result.sheet;
		expect(assets.currentAssets.cash).toBe(4515);
		expect(assets.currentAssets.accountsReceivable).toBe(145.5);
		expect(assets.totalAssets).toBe(4660.5);
		expect(liabilities.currentLiabilities.tenantCreditBalances).toBe(500);
		expect(liabilities.totalLiabilities).toBe(500);
		// Owner capital: opening balances plus every expense through the date.
		expect(equity.ownerCapital).toBe(1599.99);
		// Earned before 2026 (charged less opening) less the expenses then.
		expect(equity.retainedEarnings).toBe(850.01);
		// Earned in 2026 through the date less 2026's expenses.
		expect(equity.currentPeriodIncome).toBe(1710.5);
		// Assets less liabilities is chargedTotal, and so is equity.
		expect(equity.totalEquity).toBe(4160.5);
		expect(result.sheet.balanceCheck).toBe(true);
		expect(result.sheet.period).toEqual({
			start_date: "2026-01-01",
			end_date: "2026-03-31",
			label: "As of 2026-03-31",
		});
	});

	it("asks the ledger and the expenses for the as-of date and the year's start", async () => {
		answer({
			asOf: ledger({
				collectedTotal: 0,
				unpaidTotal: 0,
				creditBalanceTotal: 0,
				chargedTotal: 0,
				openingTotal: 0,
			}),
			atYearStart: ledger({
				collectedTotal: 0,
				unpaidTotal: 0,
				creditBalanceTotal: 0,
				chargedTotal: 0,
				openingTotal: 0,
			}),
			expensesThisYear: { total_amount: 0 },
			expensesBefore: { total_amount: 0 },
		});
		await load();
		expect(mockRpc.mock.calls).toEqual(
			expect.arrayContaining([
				[
					"get_billing_insights",
					{ owner_id_param: "user-1", end_date_param: "2026-03-31" },
				],
				[
					"get_billing_insights",
					{ owner_id_param: "user-1", end_date_param: "2025-12-31" },
				],
				[
					"get_expense_summary",
					{
						p_user_id: "user-1",
						p_start_date: "2026-01-01",
						p_end_date: "2026-03-31",
					},
				],
				[
					"get_expense_summary",
					{
						p_user_id: "user-1",
						p_start_date: "-infinity",
						p_end_date: "2025-12-31",
					},
				],
			]),
		);
		expect(mockRpc).toHaveBeenCalledTimes(4);
		// Scheduled rent is not read at all.
		expect(mockRpc).not.toHaveBeenCalledWith(
			"get_dashboard_stats",
			expect.anything(),
		);
	});

	it("reports the ledger unavailable when the server returns no ledger totals", async () => {
		// Production's body before 20261102055449: no ledger keys, literal zeros.
		const preLedgerBody = {
			totalRevenue: 30000,
			mrr: 2500,
			churnRate: 0,
			unpaidTotal: 0,
			unpaidCount: 0,
			lateFeeTotal: 0,
			tenantCount: 2,
		};
		answer({
			asOf: preLedgerBody,
			atYearStart: preLedgerBody,
			expensesThisYear: { total_amount: 1200 },
			expensesBefore: { total_amount: 0 },
		});
		const query = await load();
		expect(query.data).toEqual({
			status: "ledger-unavailable",
			asOfDate: "2026-03-31",
		});
	});

	it("does not balance a sheet whose ledger figures do not partition", async () => {
		answer({
			asOf: ledger({
				collectedTotal: 4515,
				unpaidTotal: 145.5,
				creditBalanceTotal: 500,
				chargedTotal: 4000,
				openingTotal: 0,
			}),
			atYearStart: ledger({
				collectedTotal: 0,
				unpaidTotal: 0,
				creditBalanceTotal: 0,
				chargedTotal: 0,
				openingTotal: 0,
			}),
			expensesThisYear: { total_amount: 0 },
			expensesBefore: { total_amount: 0 },
		});
		const query = await load();
		if (query.data?.status !== "ready") throw new Error("expected a sheet");
		expect(query.data.sheet.balanceCheck).toBe(false);
	});

	it("shows a figure that rounds to nothing as 0, not -0", async () => {
		answer({
			asOf: ledger({
				collectedTotal: 0.3,
				unpaidTotal: 0,
				creditBalanceTotal: 0,
				chargedTotal: 0.3,
				openingTotal: 0,
			}),
			atYearStart: ledger({
				collectedTotal: 0.1,
				unpaidTotal: 0,
				creditBalanceTotal: 0,
				chargedTotal: 0.1,
				openingTotal: 0,
			}),
			// 0.3 - 0.1 - 0.2 is -2.8e-17 in floating point.
			expensesThisYear: { total_amount: 0.2 },
			expensesBefore: { total_amount: 0 },
		});
		const query = await load();
		if (query.data?.status !== "ready") throw new Error("expected a sheet");
		expect(Object.is(query.data.sheet.equity.currentPeriodIncome, 0)).toBe(
			true,
		);
	});

	it.each([
		["the expense summary carries no total", { total_amount: null }, {}],
		["a ledger payload is an array", { total_amount: 0 }, []],
	])(
		"fails rather than showing zeros when %s",
		async (_what, expenses, payload) => {
			answer({
				asOf: Array.isArray(payload)
					? payload
					: ledger({
							collectedTotal: 1,
							unpaidTotal: 0,
							creditBalanceTotal: 0,
							chargedTotal: 1,
							openingTotal: 0,
						}),
				atYearStart: ledger({
					collectedTotal: 0,
					unpaidTotal: 0,
					creditBalanceTotal: 0,
					chargedTotal: 0,
					openingTotal: 0,
				}),
				expensesThisYear: expenses,
				expensesBefore: { total_amount: 0 },
			});
			const query = await load();
			expect(query.isError).toBe(true);
		},
	);

	it("fails when no one is signed in", async () => {
		mockGetCachedUser.mockResolvedValue(null);
		const query = await load();
		expect(query.isError).toBe(true);
		expect(mockRpc).not.toHaveBeenCalled();
	});
});

describe("useTaxDocuments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("fetches tax documents from parallel RPCs", async () => {
		mockRpc
			.mockResolvedValueOnce({
				data: { revenue: { yearly: 500000 }, units: {} },
				error: null,
			})
			.mockResolvedValueOnce({
				data: {
					total_amount: 120000,
					categories: [
						{ category: "maintenance", amount: 60000, percentage: 50 },
						{ category: "insurance", amount: 60000, percentage: 50 },
					],
				},
				error: null,
			});

		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const data = result.current.data;
		expect(data?.taxYear).toBe(2024);
		expect(data?.totals?.totalIncome).toBe(500000);
		expect(data?.totals?.totalDeductions).toBe(120000);
		expect(data?.totals?.netTaxableIncome).toBe(380000);
		expect(data?.expenseCategories?.length).toBe(2);
		expect(data?.schedule?.scheduleE?.grossRentalIncome).toBe(500000);
	});

	it("returns defaults when no user", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.taxYear).toBe(2024);
		expect(result.current.data?.totals?.totalIncome).toBe(0);
		expect(result.current.data?.expenseCategories).toEqual([]);
	});

	it("handles RPC error gracefully", async () => {
		mockRpc.mockRejectedValueOnce(new Error("Database error"));

		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});
});
