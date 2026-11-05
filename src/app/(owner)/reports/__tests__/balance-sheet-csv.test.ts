import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import {
	BALANCE_SHEET_CSV_HEADER,
	balanceSheetCsvFilename,
	buildBalanceSheetCsv,
} from "#app/(owner)/reports/balance-sheet/balance-sheet-csv";
import { buildBalanceSheetView } from "#app/(owner)/reports/balance-sheet/balance-sheet-view";
import { STATEMENT_BASIS_NOTE } from "#lib/reports/statement-basis";
import type { BalanceSheetData } from "#types/financial-statements";

function balanceData(
	overrides: Partial<BalanceSheetData> = {},
): BalanceSheetData {
	return {
		period: {
			start_date: "2026-11-30",
			end_date: "2026-11-30",
			label: "As of 2026-11-30",
		},
		assets: {
			currentAssets: {
				cash: 54000,
				accountsReceivable: 1250.5,
				total: 55250.5,
			},
			totalAssets: 55250.5,
		},
		liabilities: {
			currentLiabilities: {
				tenantCreditBalances: 750,
				total: 750,
			},
			totalLiabilities: 750,
		},
		equity: {
			ownerCapital: 3300,
			retainedEarnings: 40000,
			currentPeriodIncome: 11200.5,
			totalEquity: 54500.5,
		},
		balanceCheck: true,
		...overrides,
	};
}

function parse(csv: string): string[][] {
	const result = Papa.parse<string[]>(csv, { newline: "\r\n" });
	expect(result.errors).toEqual([]);
	return result.data;
}

const CONTEXT = ["2026-11-30", "USD"];

describe("buildBalanceSheetView", () => {
	it("groups the lines the page lists, with each group's subtotal", () => {
		const view = buildBalanceSheetView(balanceData());
		expect(view.assetGroups).toEqual([
			{
				label: "Current Assets",
				items: [
					{ name: "Cash", amount: 54000 },
					{ name: "Accounts Receivable", amount: 1250.5 },
				],
				subtotal: 55250.5,
			},
		]);
		expect(view.liabilityGroups).toEqual([
			{
				label: "Current Liabilities",
				items: [{ name: "Tenant Credit Balances", amount: 750 }],
				subtotal: 750,
			},
		]);
		expect(view.equityItems.map((i) => i.name)).toEqual([
			"Owner Capital",
			"Retained Earnings",
			"Year-to-Date Income",
		]);
	});

	it("lists no line the data model has no source for", () => {
		// Each read $0 for every owner: nothing records a deposit held, a
		// property's value or depreciation, a bill owed, an accrual or a loan.
		const view = buildBalanceSheetView(balanceData());
		const names = [...view.assetGroups, ...view.liabilityGroups].flatMap(
			(g) => [g.label, ...g.items.map((i) => i.name)],
		);
		for (const gone of [
			"Security Deposits",
			"Fixed Assets",
			"Property Values",
			"Accumulated Depreciation",
			"Net Property Value",
			"Accounts Payable",
			"Security Deposit Liability",
			"Accrued Expenses",
			"Long-Term Liabilities",
			"Mortgages Payable",
		]) {
			expect(names).not.toContain(gone);
		}
	});

	it("is empty and balanced with no data", () => {
		expect(buildBalanceSheetView(undefined)).toEqual({
			totalAssets: 0,
			totalLiabilities: 0,
			totalEquity: 0,
			isBalanced: true,
			assetGroups: [],
			liabilityGroups: [],
			equityItems: [],
		});
	});
});

describe("buildBalanceSheetCsv", () => {
	it("writes the header and every figure on the page, top to bottom", () => {
		const rows = parse(
			buildBalanceSheetCsv({
				asOfDate: "2026-11-30",
				view: buildBalanceSheetView(balanceData()),
			}),
		);
		expect(rows[0]).toEqual([...BALANCE_SHEET_CSV_HEADER]);
		expect(rows.slice(1)).toEqual([
			[...CONTEXT, "Totals", "", "Total Assets", "55250.50"],
			[...CONTEXT, "Totals", "", "Total Liabilities", "750.00"],
			[...CONTEXT, "Totals", "", "Total Equity", "54500.50"],
			[...CONTEXT, "Balance Check", "", "Balanced", ""],
			[...CONTEXT, "Assets", "Current Assets", "Cash", "54000.00"],
			[
				...CONTEXT,
				"Assets",
				"Current Assets",
				"Accounts Receivable",
				"1250.50",
			],
			[...CONTEXT, "Assets", "Current Assets", "Subtotal", "55250.50"],
			[...CONTEXT, "Assets", "", "Total Assets", "55250.50"],
			[
				...CONTEXT,
				"Liabilities",
				"Current Liabilities",
				"Tenant Credit Balances",
				"750.00",
			],
			[...CONTEXT, "Liabilities", "Current Liabilities", "Subtotal", "750.00"],
			[...CONTEXT, "Liabilities", "", "Total Liabilities", "750.00"],
			[...CONTEXT, "Equity", "", "Owner Capital", "3300.00"],
			[...CONTEXT, "Equity", "", "Retained Earnings", "40000.00"],
			[...CONTEXT, "Equity", "", "Year-to-Date Income", "11200.50"],
			[...CONTEXT, "Equity", "", "Total Equity", "54500.50"],
			// The note under the page's figures, one row per entry.
			...STATEMENT_BASIS_NOTE.map((entry) => [
				...CONTEXT,
				"Basis of Presentation",
				"",
				entry,
				"",
			]),
		]);
	});

	it("names an unbalanced sheet", () => {
		const csv = buildBalanceSheetCsv({
			asOfDate: "2026-11-30",
			view: buildBalanceSheetView(balanceData({ balanceCheck: false })),
		});
		expect(csv).toContain("2026-11-30,USD,Balance Check,,Unbalanced,\r\n");
	});
});

describe("balanceSheetCsvFilename", () => {
	it("names the file by the as-of date", () => {
		expect(balanceSheetCsvFilename("2026-02-28")).toBe(
			"tenantflow-balance-sheet-2026-02-28.csv",
		);
	});

	it("rejects a date that is not a real YYYY-MM-DD day", () => {
		expect(() => balanceSheetCsvFilename("2026-02-30")).toThrow(RangeError);
		expect(() => balanceSheetCsvFilename("Nov 30 2026")).toThrow(RangeError);
	});
});
