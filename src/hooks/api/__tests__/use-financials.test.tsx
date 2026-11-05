/**
 * Financial Statement Hooks Tests
 *
 * Tests useIncomeStatement, useCashFlow, useBalanceSheet, useTaxDocuments
 * using Supabase RPC mocks. These hooks delegate to financial-keys.ts, which
 * calls get_billing_insights (the rent ledger as of a date) and
 * get_expense_summary; none of them reads get_dashboard_stats.
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

/**
 * get_billing_insights as of a date (20261102055449): the by-type charges and
 * the receipts. The scheduled-rent keys ride along and must reach no line.
 */
function ledgerAsOf(figures: Record<string, number>) {
	return { totalRevenue: 999999, mrr: 83333.25, tenantCount: 3, ...figures };
}

/** Answer each RPC by name and arguments: the ledger as of each date, and expenses. */
function answerPeriod(answers: {
	ledger: Record<string, unknown>;
	expenses: unknown;
}) {
	mockRpc.mockImplementation(
		async (fn: string, args: Record<string, unknown>) => {
			if (fn === "get_billing_insights") {
				const date = String(args.end_date_param);
				return { data: answers.ledger[date] ?? null, error: null };
			}
			if (fn === "get_expense_summary") {
				return { data: answers.expenses, error: null };
			}
			return {
				data: { revenue: { yearly: 999999, monthly: 83333 } },
				error: null,
			};
		},
	);
}

describe("useIncomeStatement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("reads revenue as what the ledger charged in the period, by type", async () => {
		answerPeriod({
			ledger: {
				"2026-03-31": ledgerAsOf({
					rentChargedTotal: 3500,
					lateFeeChargedTotal: 170,
					manualChargedTotal: 390.5,
					creditTotal: -100,
					openingTotal: 300,
					chargedTotal: 4260.5,
				}),
				"2026-01-31": ledgerAsOf({
					rentChargedTotal: 2500,
					lateFeeChargedTotal: 60,
					manualChargedTotal: 140,
					creditTotal: 0,
					openingTotal: 300,
					chargedTotal: 3000,
				}),
			},
			expenses: { total_amount: 260.5 },
		});

		const { result } = renderHook(
			() =>
				useIncomeStatement({
					start_date: "2026-02-01",
					end_date: "2026-03-31",
				}),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const data = result.current.data;
		if (data?.status !== "ready") throw new Error("expected a statement");
		expect(data.statement.revenue).toEqual({
			rentalIncome: 1000,
			lateFeesIncome: 110,
			otherIncome: 250.5,
			creditsIssued: -100,
			totalRevenue: 1260.5,
		});
		// One expense figure: there is no category to split it by.
		expect(data.statement.expenses).toEqual({ totalExpenses: 260.5 });
		expect(data.statement.netIncome).toBe(1000);
		// Only figures with a source: no gross profit or operating income (each
		// restated net income) and no margin the page never reads (OD-5, OD-6).
		expect(Object.keys(data.statement).sort()).toEqual([
			"expenses",
			"netIncome",
			"period",
			"revenue",
		]);
		// As of the period's end and of the day before it starts.
		expect(mockRpc).toHaveBeenCalledWith("get_billing_insights", {
			owner_id_param: "user-1",
			end_date_param: "2026-03-31",
		});
		expect(mockRpc).toHaveBeenCalledWith("get_billing_insights", {
			owner_id_param: "user-1",
			end_date_param: "2026-01-31",
		});
		expect(mockRpc).toHaveBeenCalledWith("get_expense_summary", {
			p_user_id: "user-1",
			p_start_date: "2026-02-01",
			p_end_date: "2026-03-31",
		});
		expect(mockRpc).not.toHaveBeenCalledWith(
			"get_dashboard_stats",
			expect.anything(),
		);
	});

	it("differences against the day before a period that starts on January 1", async () => {
		answerPeriod({
			ledger: {
				"2026-01-31": ledgerAsOf({
					rentChargedTotal: 1000,
					lateFeeChargedTotal: 0,
					manualChargedTotal: 0,
					creditTotal: 0,
				}),
				"2025-12-31": ledgerAsOf({
					rentChargedTotal: 600,
					lateFeeChargedTotal: 0,
					manualChargedTotal: 0,
					creditTotal: 0,
				}),
			},
			expenses: { total_amount: 0 },
		});
		const { result } = renderHook(
			() =>
				useIncomeStatement({
					start_date: "2026-01-01",
					end_date: "2026-01-31",
				}),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		const data = result.current.data;
		if (data?.status !== "ready") throw new Error("expected a statement");
		expect(data.statement.revenue.rentalIncome).toBe(400);
	});

	it("reports the ledger unavailable when the server returns no by-type figures", async () => {
		// Part K's body: every balance-sheet key, none of the income statement's.
		const balanceSheetOnly = ledgerAsOf({
			collectedTotal: 4515,
			unpaidTotal: 145.5,
			creditBalanceTotal: 400,
			chargedTotal: 4260.5,
			openingTotal: 300,
		});
		answerPeriod({
			ledger: {
				"2026-03-31": balanceSheetOnly,
				"2026-01-31": balanceSheetOnly,
			},
			expenses: { total_amount: 0 },
		});
		const { result } = renderHook(
			() =>
				useIncomeStatement({
					start_date: "2026-02-01",
					end_date: "2026-03-31",
				}),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(result.current.data).toEqual({
			status: "ledger-unavailable",
			period: {
				start_date: "2026-02-01",
				end_date: "2026-03-31",
				label: "2026-02-01 to 2026-03-31",
			},
		});
	});

	it("fails when no one is signed in, rather than drawing a $0 statement", async () => {
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
			expect(result.current.isError).toBe(true);
		});
		expect(mockRpc).not.toHaveBeenCalled();
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

	function position(collectedTotal: number) {
		return ledgerAsOf({
			collectedTotal,
			unpaidTotal: 0,
			creditBalanceTotal: 0,
			chargedTotal: collectedTotal,
			openingTotal: 0,
		});
	}

	it("reads rent received in the period, and the balance sheet's cash either side", async () => {
		answerPeriod({
			ledger: { "2026-03-31": position(4515), "2026-01-31": position(3040) },
			expenses: { total_amount: 260.5, monthly_average: 9999 },
		});

		const { result } = renderHook(
			() => useCashFlow({ start_date: "2026-02-01", end_date: "2026-03-31" }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const data = result.current.data;
		if (data?.status !== "ready") throw new Error("expected a report");
		const { report } = data;
		expect(report.operatingActivities).toEqual({
			rentalPaymentsReceived: 1475,
			expensesPaid: 260.5,
			netOperatingCash: 1214.5,
		});
		// No investing section, and no line nothing records (each read $0).
		expect(Object.keys(report)).not.toContain("investingActivities");
		expect(report.financingActivities).toEqual({
			ownerContributions: 260.5,
			netFinancingCash: 260.5,
		});
		// The period's expenses, not the trailing twelve months' average.
		expect(report.financingActivities.ownerContributions).toBe(260.5);
		expect(report.financingActivities.netFinancingCash).toBe(260.5);
		expect(report.netCashFlow).toBe(1475);
		expect(report.beginningCash).toBe(3040);
		expect(report.endingCash).toBe(4515);
		expect(report.endingCash - report.beginningCash).toBe(report.netCashFlow);
		expect(mockRpc).not.toHaveBeenCalledWith(
			"get_dashboard_stats",
			expect.anything(),
		);
	});

	it("reports the ledger unavailable when the server returns no ledger totals", async () => {
		const before = { totalRevenue: 30000, mrr: 2500, unpaidTotal: 0 };
		answerPeriod({
			ledger: { "2026-03-31": before, "2026-01-31": before },
			expenses: { total_amount: 0 },
		});
		const { result } = renderHook(
			() => useCashFlow({ start_date: "2026-02-01", end_date: "2026-03-31" }),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(result.current.data?.status).toBe("ledger-unavailable");
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
		// Only the lines the ledger records: no deposit, property value,
		// depreciation, payable, accrual or mortgage line reading $0.
		expect(assets).toEqual({
			currentAssets: { cash: 4515, accountsReceivable: 145.5, total: 4660.5 },
			totalAssets: 4660.5,
		});
		expect(liabilities).toEqual({
			currentLiabilities: { tenantCreditBalances: 500, total: 500 },
			totalLiabilities: 500,
		});
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

	it("reads the tax year's income as rent received on the ledger", async () => {
		answerPeriod({
			ledger: {
				"2024-12-31": ledgerAsOf({ collectedTotal: 512345.67 }),
				"2023-12-31": ledgerAsOf({ collectedTotal: 12345.67 }),
			},
			expenses: {
				total_amount: 120000,
				categories: [
					{ category: "maintenance", amount: 60000, percentage: 50 },
					{ category: "insurance", amount: 60000, percentage: 50 },
				],
			},
		});

		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const result_ = result.current.data;
		if (result_?.status !== "ready") throw new Error("expected documents");
		const data = result_.documents;
		expect(data.taxYear).toBe(2024);
		// 512,345.67 received by the end of 2024 less 12,345.67 by the end of
		// 2023; the scheduled 999,999 rides along and is in no figure.
		expect(data.totals.totalIncome).toBe(500000);
		expect(data.totals.totalExpenses).toBe(120000);
		expect(data.totals.netIncome).toBe(380000);
		expect(data.expenseCategories.length).toBe(2);
		// No deduction, Schedule E or depreciation figure: TenantFlow
		// determines none, and the literal zeros that stood in are gone.
		expect(Object.keys(data).sort()).toEqual([
			"expenseCategories",
			"period",
			"taxYear",
			"totals",
		]);
		expect(Object.keys(data.expenseCategories[0] ?? {}).sort()).toEqual([
			"amount",
			"category",
			"percentage",
		]);
		expect(mockRpc).not.toHaveBeenCalledWith(
			"get_dashboard_stats",
			expect.anything(),
		);
	});

	it("reports the ledger unavailable rather than a $0 gross income", async () => {
		answerPeriod({
			ledger: {
				"2024-12-31": { totalRevenue: 30000, unpaidTotal: 0 },
				"2023-12-31": { totalRevenue: 30000, unpaidTotal: 0 },
			},
			expenses: { total_amount: 0, categories: [] },
		});
		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper(),
		});
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(result.current.data).toEqual({
			status: "ledger-unavailable",
			taxYear: 2024,
		});
	});

	it("fails when no one is signed in, rather than drawing $0 documents", async () => {
		mockGetCachedUser.mockResolvedValue(null);

		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockRpc).not.toHaveBeenCalled();
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
