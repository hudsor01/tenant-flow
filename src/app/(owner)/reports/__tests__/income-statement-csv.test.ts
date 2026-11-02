import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import {
	buildIncomeStatementCsv,
	INCOME_STATEMENT_CSV_HEADER,
	incomeStatementCsvFilename,
} from "#app/(owner)/reports/income-statement/income-statement-csv";
import { buildIncomeStatementView } from "#app/(owner)/reports/income-statement/income-statement-view";
import type { IncomeStatementData } from "#types/financial-statements";

function incomeData(
	overrides: Partial<IncomeStatementData> = {},
): IncomeStatementData {
	return {
		period: {
			start_date: "2026-11-01",
			end_date: "2026-11-30",
			label: "2026-11-01 to 2026-11-30",
		},
		revenue: {
			rentalIncome: 54000,
			lateFeesIncome: 0,
			otherIncome: 0,
			creditsIssued: 0,
			totalRevenue: 54000,
		},
		expenses: {
			propertyManagement: 0,
			maintenance: 1200,
			utilities: 0,
			insurance: 0,
			propertyTax: 0,
			mortgage: 0,
			other: 300,
			totalExpenses: 1500,
		},
		grossProfit: 52500,
		operatingIncome: 52500,
		netIncome: 52500,
		profitMargin: 97.2,
		...overrides,
	};
}

function parse(csv: string): string[][] {
	const result = Papa.parse<string[]>(csv, { newline: "\r\n" });
	expect(result.errors).toEqual([]);
	return result.data;
}

const CONTEXT = ["Monthly", "2026-11-01", "2026-11-30", "USD"];

function csvFor(data: IncomeStatementData, period = "monthly"): string[][] {
	return parse(
		buildIncomeStatementCsv({
			period,
			startDate: data.period.start_date,
			endDate: data.period.end_date,
			view: buildIncomeStatementView(data),
		}),
	);
}

describe("buildIncomeStatementView", () => {
	it("keeps every revenue line, drops the empty expense lines, and shares each", () => {
		const view = buildIncomeStatementView(incomeData());
		expect(view.revenueItems.map((i) => [i.label, i.amount, i.share])).toEqual([
			["Rent Charged", 54000, 100],
			["Late Fees Charged", 0, 0],
			["Other Charges", 0, 0],
			["Credits Issued", 0, 0],
		]);
		expect(view.expenseItems.map((i) => [i.label, i.amount, i.share])).toEqual([
			["Maintenance", 1200, 80],
			["Other", 300, 20],
		]);
		expect(view.profitMargin).toBeCloseTo((52500 / 54000) * 100, 10);
	});

	it("reads zero everywhere with no data, and a zero margin with no revenue", () => {
		const view = buildIncomeStatementView(undefined);
		expect(view).toMatchObject({
			totalRevenue: 0,
			totalExpenses: 0,
			netIncome: 0,
			profitMargin: 0,
			expenseItems: [],
			grossProfit: undefined,
			operatingIncome: undefined,
			previousPeriod: undefined,
		});
		expect(
			view.revenueItems.every((i) => i.amount === 0 && i.share === 0),
		).toBe(true);
	});
});

describe("buildIncomeStatementCsv", () => {
	it("writes the header and every figure on the page, top to bottom", () => {
		const rows = csvFor(incomeData());
		expect(rows[0]).toEqual([...INCOME_STATEMENT_CSV_HEADER]);
		expect(rows.slice(1)).toEqual([
			[...CONTEXT, "Totals", "Total Revenue", "", "54000.00"],
			[...CONTEXT, "Totals", "Total Expenses", "", "1500.00"],
			[...CONTEXT, "Totals", "Net Income", "", "52500.00"],
			[...CONTEXT, "Totals", "Profit Margin", "97.2", ""],
			[...CONTEXT, "Revenue Breakdown", "Rent Charged", "100.0", "54000.00"],
			[...CONTEXT, "Revenue Breakdown", "Late Fees Charged", "0.0", "0.00"],
			[...CONTEXT, "Revenue Breakdown", "Other Charges", "0.0", "0.00"],
			[...CONTEXT, "Revenue Breakdown", "Credits Issued", "0.0", "0.00"],
			[...CONTEXT, "Revenue Breakdown", "Total Revenue", "", "54000.00"],
			[...CONTEXT, "Expense Breakdown", "Maintenance", "80.0", "1200.00"],
			[...CONTEXT, "Expense Breakdown", "Other", "20.0", "300.00"],
			[...CONTEXT, "Expense Breakdown", "Total Expenses", "", "1500.00"],
			[...CONTEXT, "Net Income Summary", "Total Revenue", "", "54000.00"],
			[
				...CONTEXT,
				"Net Income Summary",
				"Total Operating Expenses",
				"",
				"-1500.00",
			],
			[...CONTEXT, "Net Income Summary", "Gross Profit", "", "52500.00"],
			[...CONTEXT, "Net Income Summary", "Operating Income", "", "52500.00"],
			[...CONTEXT, "Net Income Summary", "Net Income", "", "52500.00"],
		]);
	});

	it("keeps a net loss negative and adds the period comparison the page shows", () => {
		const rows = csvFor(
			incomeData({
				revenue: {
					rentalIncome: 1000,
					lateFeesIncome: 0,
					otherIncome: 0,
					creditsIssued: 0,
					totalRevenue: 1000,
				},
				netIncome: -500,
				grossProfit: -500,
				operatingIncome: -500,
				previousPeriod: { netIncome: 250, change: -750, changePercent: -300 },
			}),
			"quarterly",
		);
		const find = (section: string, item: string) =>
			rows.find((r) => r[4] === section && r[5] === item);
		expect(find("Totals", "Net Income")?.[7]).toBe("-500.00");
		expect(find("Totals", "Profit Margin")?.[6]).toBe("-50.0");
		expect(find("Net Income Summary", "Net Income")?.[7]).toBe("-500.00");
		expect(rows.at(-1)).toEqual([
			"Quarterly",
			"2026-11-01",
			"2026-11-30",
			"USD",
			"Period Comparison",
			"Previous Period",
			"-300.0",
			"250.00",
		]);
	});

	it("writes each ledger revenue line, a credit negative, as the page lists them", () => {
		const rows = csvFor(
			incomeData({
				revenue: {
					rentalIncome: 1000,
					lateFeesIncome: 110,
					otherIncome: 250.5,
					creditsIssued: -100,
					totalRevenue: 1260.5,
				},
			}),
		);
		const revenue = rows
			.filter((r) => r[4] === "Revenue Breakdown")
			.map((r) => [r[5], r[7]]);
		expect(revenue).toEqual([
			["Rent Charged", "1000.00"],
			["Late Fees Charged", "110.00"],
			["Other Charges", "250.50"],
			["Credits Issued", "-100.00"],
			["Total Revenue", "1260.50"],
		]);
	});

	it("neutralizes a formula-like period label but never a negative amount", () => {
		const csv = buildIncomeStatementCsv({
			period: "=HYPERLINK()",
			startDate: "2026-11-01",
			endDate: "2026-11-30",
			view: buildIncomeStatementView(incomeData({ netIncome: -1 })),
		});
		const rows = parse(csv);
		expect(rows[1]?.[0]).toBe("'=HYPERLINK()");
		expect(csv).toContain(",Net Income,,-1.00");
	});
});

describe("incomeStatementCsvFilename", () => {
	it("names the file by the statement's date range", () => {
		expect(incomeStatementCsvFilename("2026-10-01", "2026-12-31")).toBe(
			"tenantflow-income-statement-2026-10-01-to-2026-12-31.csv",
		);
	});

	it("rejects a date that is not a real YYYY-MM-DD day", () => {
		expect(() => incomeStatementCsvFilename("2026-1-01", "2026-12-31")).toThrow(
			RangeError,
		);
		expect(() =>
			incomeStatementCsvFilename("2026-06-01", "2026-06-31"),
		).toThrow(RangeError);
	});
});
