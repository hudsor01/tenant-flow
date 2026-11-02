import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import {
	BALANCE_SHEET_CSV_HEADER,
	balanceSheetCsvFilename,
	buildBalanceSheetCsv,
} from "#app/(owner)/reports/balance-sheet/balance-sheet-csv";
import { buildBalanceSheetView } from "#app/(owner)/reports/balance-sheet/balance-sheet-view";
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
				security_deposits: 0,
				total: 55250.5,
			},
			fixedAssets: {
				propertyValues: 0,
				accumulatedDepreciation: 0,
				netPropertyValue: 0,
				total: 0,
			},
			totalAssets: 55250.5,
		},
		liabilities: {
			currentLiabilities: {
				accountsPayable: 0,
				tenantCreditBalances: 750,
				security_depositLiability: 0,
				accruedExpenses: 0,
				total: 750,
			},
			longTermLiabilities: { mortgagesPayable: 0, total: 0 },
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
		const view = buildBalanceSheetView(
			balanceData({
				assets: {
					currentAssets: {
						cash: 100,
						accountsReceivable: 20,
						security_deposits: 3,
						total: 123,
					},
					fixedAssets: {
						propertyValues: 1000,
						accumulatedDepreciation: 50,
						netPropertyValue: 950,
						total: 950,
					},
					totalAssets: 1073,
				},
			}),
		);
		expect(view.assetGroups).toEqual([
			{
				label: "Current Assets",
				items: [
					{ name: "Cash", amount: 100 },
					{ name: "Accounts Receivable", amount: 20 },
					{ name: "Security Deposits", amount: 3 },
				],
				subtotal: 123,
			},
			{
				label: "Fixed Assets",
				items: [
					{ name: "Property Values", amount: 1000 },
					{ name: "Accumulated Depreciation", amount: -50 },
					{ name: "Net Property Value", amount: 950 },
				],
				subtotal: 950,
			},
		]);
		expect(view.liabilityGroups.map((g) => g.label)).toEqual([
			"Current Liabilities",
			"Long-Term Liabilities",
		]);
		expect(view.liabilityGroups[0]?.items.map((i) => i.name)).toEqual([
			"Accounts Payable",
			"Tenant Credit Balances",
			"Security Deposit Liability",
			"Accrued Expenses",
		]);
		expect(view.liabilityGroups[0]?.subtotal).toBe(750);
		expect(view.equityItems.map((i) => i.name)).toEqual([
			"Owner Capital",
			"Retained Earnings",
			"Year-to-Date Income",
		]);
	});

	it("shows no depreciation as 0, not -0 (which formats as -$0.00)", () => {
		const [, fixed] = buildBalanceSheetView(balanceData()).assetGroups;
		const depreciation = fixed?.items.find(
			(i) => i.name === "Accumulated Depreciation",
		);
		expect(Object.is(depreciation?.amount, 0)).toBe(true);
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
			[...CONTEXT, "Assets", "Current Assets", "Security Deposits", "0.00"],
			[...CONTEXT, "Assets", "Current Assets", "Subtotal", "55250.50"],
			[...CONTEXT, "Assets", "Fixed Assets", "Property Values", "0.00"],
			[
				...CONTEXT,
				"Assets",
				"Fixed Assets",
				"Accumulated Depreciation",
				"0.00",
			],
			[...CONTEXT, "Assets", "Fixed Assets", "Net Property Value", "0.00"],
			[...CONTEXT, "Assets", "Fixed Assets", "Subtotal", "0.00"],
			[...CONTEXT, "Assets", "", "Total Assets", "55250.50"],
			[
				...CONTEXT,
				"Liabilities",
				"Current Liabilities",
				"Accounts Payable",
				"0.00",
			],
			[
				...CONTEXT,
				"Liabilities",
				"Current Liabilities",
				"Tenant Credit Balances",
				"750.00",
			],
			[
				...CONTEXT,
				"Liabilities",
				"Current Liabilities",
				"Security Deposit Liability",
				"0.00",
			],
			[
				...CONTEXT,
				"Liabilities",
				"Current Liabilities",
				"Accrued Expenses",
				"0.00",
			],
			[...CONTEXT, "Liabilities", "Current Liabilities", "Subtotal", "750.00"],
			[
				...CONTEXT,
				"Liabilities",
				"Long-Term Liabilities",
				"Mortgages Payable",
				"0.00",
			],
			[...CONTEXT, "Liabilities", "Long-Term Liabilities", "Subtotal", "0.00"],
			[...CONTEXT, "Liabilities", "", "Total Liabilities", "750.00"],
			[...CONTEXT, "Equity", "", "Owner Capital", "3300.00"],
			[...CONTEXT, "Equity", "", "Retained Earnings", "40000.00"],
			[...CONTEXT, "Equity", "", "Year-to-Date Income", "11200.50"],
			[...CONTEXT, "Equity", "", "Total Equity", "54500.50"],
		]);
	});

	it("names an unbalanced sheet and keeps depreciation negative", () => {
		const csv = buildBalanceSheetCsv({
			asOfDate: "2026-11-30",
			view: buildBalanceSheetView(
				balanceData({
					balanceCheck: false,
					assets: {
						currentAssets: {
							cash: 0,
							accountsReceivable: 0,
							security_deposits: 0,
							total: 0,
						},
						fixedAssets: {
							propertyValues: 900,
							accumulatedDepreciation: 100,
							netPropertyValue: 800,
							total: 800,
						},
						totalAssets: 800,
					},
				}),
			),
		});
		expect(csv).toContain("2026-11-30,USD,Balance Check,,Unbalanced,\r\n");
		expect(csv).toContain(
			"2026-11-30,USD,Assets,Fixed Assets,Accumulated Depreciation,-100.00",
		);
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
