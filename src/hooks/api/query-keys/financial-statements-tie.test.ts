/**
 * The three statements tie (66.2-39 part L).
 *
 * The income statement used to present scheduled rent (active leases' rent
 * times twelve) as any period's revenue and the cash flow scheduled rent as
 * rent received, while the balance sheet read the rent ledger as of its date:
 * the same owner's three statements described three different businesses. All
 * three now read the ledger through get_billing_insights as of a date, so:
 *   - the income statement's net income for January 1 to a date is the balance
 *     sheet's Year-to-Date Income as of that date;
 *   - its net income from before the ledger began to December 31 is the
 *     balance sheet's Retained Earnings the next year;
 *   - the cash flow's opening and closing balances are the balance sheet's
 *     Cash the day before its period and on its last day, and its net cash
 *     flow their difference.
 *
 * A fake ledger answers each call as production's 20261102055449 body would,
 * from one list of dated rows: every row dated on or before end_date_param
 * counts at its signed amount (a reversal is a row like any other). One
 * lease, so the per-lease floors are the whole ledger's.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ rpc: mockRpc }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));

import { financialQueries } from "./financial-keys";

type ChargeType = "rent" | "late_fee" | "manual_charge" | "credit" | "opening";

/** Dated ledger rows: charges by entry date, receipts by received date. */
const CHARGES: ReadonlyArray<{
	date: string;
	type: ChargeType;
	amount: number;
}> = [
	{ date: "2025-06-01", type: "opening", amount: 500 },
	{ date: "2025-06-01", type: "rent", amount: 1200 },
	{ date: "2025-07-01", type: "rent", amount: 1200 },
	{ date: "2025-07-06", type: "late_fee", amount: 75 },
	{ date: "2025-08-01", type: "rent", amount: 1200 },
	// A rent charge and its reversal, both dated its period (reverse_charge).
	{ date: "2025-09-01", type: "rent", amount: 1200 },
	{ date: "2025-09-01", type: "rent", amount: -1200 },
	{ date: "2025-12-15", type: "credit", amount: -150 },
	{ date: "2026-01-01", type: "rent", amount: 1250 },
	{ date: "2026-01-20", type: "manual_charge", amount: 89.99 },
	{ date: "2026-02-01", type: "rent", amount: 1250 },
	{ date: "2026-02-06", type: "late_fee", amount: 50 },
	// A late fee dated in March whose reversal was posted in April.
	{ date: "2026-03-06", type: "late_fee", amount: 50 },
	{ date: "2026-04-02", type: "late_fee", amount: -50 },
	{ date: "2026-03-01", type: "rent", amount: 1250 },
	{ date: "2026-03-10", type: "credit", amount: -25.5 },
];

const RECEIPTS: ReadonlyArray<{ date: string; amount: number }> = [
	{ date: "2025-06-03", amount: 1700 },
	{ date: "2025-07-10", amount: 1275 },
	{ date: "2025-09-02", amount: 1200 },
	// The September receipt's reversal, posted the day the charge was reversed.
	{ date: "2025-09-20", amount: -1200 },
	{ date: "2025-12-30", amount: 1300 },
	{ date: "2026-01-05", amount: 1250 },
	{ date: "2026-02-15", amount: 1000.01 },
	{ date: "2026-03-31", amount: 1300 },
];

const EXPENSES: ReadonlyArray<{ date: string; amount: number }> = [
	{ date: "2025-06-20", amount: 310.25 },
	{ date: "2025-11-11", amount: 99.99 },
	{ date: "2026-01-15", amount: 120 },
	{ date: "2026-03-31", amount: 45.45 },
	{ date: "2026-04-01", amount: 999 },
];

const sum = (values: readonly number[]) =>
	Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;

/** get_billing_insights with end_date_param alone, from the rows above. */
function billingInsightsAsOf(end: string) {
	const charges = CHARGES.filter((c) => c.date <= end);
	const byType = (type: ChargeType) =>
		sum(charges.filter((c) => c.type === type).map((c) => c.amount));
	const chargedTotal = sum(charges.map((c) => c.amount));
	const collectedTotal = sum(
		RECEIPTS.filter((r) => r.date <= end).map((r) => r.amount),
	);
	return {
		totalRevenue: 15000,
		mrr: 1250,
		chargedTotal,
		collectedTotal,
		unpaidTotal: Math.max(sum([chargedTotal, -collectedTotal]), 0),
		creditBalanceTotal: Math.max(sum([collectedTotal, -chargedTotal]), 0),
		openingTotal: byType("opening"),
		rentChargedTotal: byType("rent"),
		lateFeeChargedTotal: byType("late_fee"),
		manualChargedTotal: byType("manual_charge"),
		creditTotal: byType("credit"),
	};
}

/** get_expense_summary's total for an inclusive range ('-infinity' allowed). */
function expenseSummary(start: string, end: string) {
	const from = start === "-infinity" ? "" : start;
	return {
		total_amount: sum(
			EXPENSES.filter((e) => e.date >= from && e.date <= end).map(
				(e) => e.amount,
			),
		),
		categories: [],
		monthly_totals: [],
		monthly_average: 0,
	};
}

beforeEach(() => {
	mockRpc.mockReset();
	mockRpc.mockImplementation(
		async (name: string, args: Record<string, unknown>) => {
			if (name === "get_billing_insights") {
				return {
					data: billingInsightsAsOf(String(args.end_date_param)),
					error: null,
				};
			}
			if (name === "get_expense_summary") {
				return {
					data: expenseSummary(
						String(args.p_start_date),
						String(args.p_end_date),
					),
					error: null,
				};
			}
			throw new Error(`the statements read no ${name}`);
		},
	);
});

async function balanceSheet(asOf: string) {
	const result = await new QueryClient().query(
		financialQueries.balanceSheet(asOf),
	);
	if (result.status !== "ready") throw new Error("expected a sheet");
	return result.sheet;
}

async function incomeStatement(start_date: string, end_date: string) {
	const result = await new QueryClient().query(
		financialQueries.incomeStatement({ start_date, end_date }),
	);
	if (result.status !== "ready") throw new Error("expected a statement");
	return result.statement;
}

async function cashFlow(start_date: string, end_date: string) {
	const result = await new QueryClient().query(
		financialQueries.cashFlow({ start_date, end_date }),
	);
	if (result.status !== "ready") throw new Error("expected a report");
	return result.report;
}

describe("the statements tie", () => {
	it("the income statement's net income for the year to date is the sheet's Year-to-Date Income", async () => {
		const sheet = await balanceSheet("2026-03-31");
		const statement = await incomeStatement("2026-01-01", "2026-03-31");
		// 1250 + 89.99 + 1250 + 50 + 50 + 1250 - 25.5 charged (the April
		// reversal is after the date), less 120 + 45.45 of expenses.
		expect(statement.revenue.totalRevenue).toBe(3914.49);
		expect(statement.netIncome).toBe(3749.04);
		expect(sheet.equity.currentPeriodIncome).toBe(statement.netIncome);
	});

	it("the income statement's net income before the year is the sheet's Retained Earnings", async () => {
		const sheet = await balanceSheet("2026-03-31");
		const statement = await incomeStatement("2000-01-01", "2025-12-31");
		// 1200 * 4 - 1200 + 75 - 150 charged (the 500 opening is not revenue),
		// less 310.25 + 99.99 of expenses.
		expect(statement.revenue.totalRevenue).toBe(3525);
		expect(statement.netIncome).toBe(3114.76);
		expect(sheet.equity.retainedEarnings).toBe(statement.netIncome);
	});

	it("ties for a month that ends a year and for one that starts it", async () => {
		const december = await balanceSheet("2025-12-31");
		expect(december.equity.currentPeriodIncome).toBe(
			(await incomeStatement("2025-01-01", "2025-12-31")).netIncome,
		);
		const january = await balanceSheet("2026-01-31");
		expect(january.equity.currentPeriodIncome).toBe(
			(await incomeStatement("2026-01-01", "2026-01-31")).netIncome,
		);
		expect(january.equity.retainedEarnings).toBe(
			(await incomeStatement("2000-01-01", "2025-12-31")).netIncome,
		);
	});

	it("the cash flow's balances are the sheet's Cash either side of its period", async () => {
		const report = await cashFlow("2026-02-01", "2026-03-31");
		const opening = await balanceSheet("2026-01-31");
		const closing = await balanceSheet("2026-03-31");
		expect(report.beginningCash).toBe(opening.assets.currentAssets.cash);
		expect(report.endingCash).toBe(closing.assets.currentAssets.cash);
		// Received February 15 and March 31, the period's last day.
		expect(report.operatingActivities.rentalPaymentsReceived).toBe(2300.01);
		expect(report.netCashFlow).toBe(
			Math.round((report.endingCash - report.beginningCash) * 100) / 100,
		);
		// The period's one expense, paid with the owner's funds, as the sheet
		// carries it.
		expect(report.operatingActivities.expensesPaid).toBe(45.45);
		expect(report.financingActivities.ownerContributions).toBe(45.45);
	});

	it("counts a reversal in the period it was posted in, as the sheet does", async () => {
		const march = await incomeStatement("2026-03-01", "2026-03-31");
		const april = await incomeStatement("2026-04-01", "2026-04-30");
		expect(march.revenue.lateFeesIncome).toBe(50);
		expect(april.revenue.lateFeesIncome).toBe(-50);
		const september = await cashFlow("2025-09-01", "2025-09-30");
		expect(september.operatingActivities.rentalPaymentsReceived).toBe(0);
	});

	it("leaves opening balances out of revenue, as the sheet carries them in capital", async () => {
		const june = await incomeStatement("2025-06-01", "2025-06-30");
		expect(june.revenue.totalRevenue).toBe(1200);
		const sheet = await balanceSheet("2025-06-30");
		expect(sheet.equity.currentPeriodIncome).toBe(june.netIncome);
		expect(sheet.equity.ownerCapital).toBe(810.25);
	});
});
