import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import {
	buildCashFlowCsv,
	CASH_FLOW_CSV_HEADER,
	cashFlowCsvFilename,
} from "#app/(owner)/reports/cash-flow/cash-flow-csv";
import {
	buildCashFlowView,
	type CashFlowView,
} from "#app/(owner)/reports/cash-flow/cash-flow-view";
import { STATEMENT_BASIS_NOTE } from "#lib/reports/statement-basis";
import type { CashFlowData } from "#types/financial-statements";

function cashFlowData(overrides: Partial<CashFlowData> = {}): CashFlowData {
	return {
		period: {
			start_date: "2026-11-01",
			end_date: "2026-11-30",
			label: "2026-11-01 to 2026-11-30",
		},
		operatingActivities: {
			rentalPaymentsReceived: 4500,
			expensesPaid: 1500,
			netOperatingCash: 3000,
		},
		financingActivities: {
			ownerContributions: 0,
			netFinancingCash: 0,
		},
		netCashFlow: 3000,
		beginningCash: 0,
		endingCash: 0,
		...overrides,
	};
}

function parse(csv: string): string[][] {
	const result = Papa.parse<string[]>(csv, { newline: "\r\n" });
	expect(result.errors).toEqual([]);
	return result.data;
}

const CONTEXT = ["Monthly", "2026-11-01", "2026-11-30", "USD"];

describe("buildCashFlowCsv", () => {
	it("writes the header and every figure on the page, top to bottom", () => {
		const rows = parse(
			buildCashFlowCsv({
				period: "monthly",
				startDate: "2026-11-01",
				endDate: "2026-11-30",
				view: buildCashFlowView(cashFlowData()),
			}),
		);
		expect(rows[0]).toEqual([...CASH_FLOW_CSV_HEADER]);
		expect(rows.slice(1)).toEqual([
			[...CONTEXT, "Balance Summary", "Opening Balance", "", "0.00"],
			[...CONTEXT, "Balance Summary", "Net Cash Flow", "", "3000.00"],
			[...CONTEXT, "Balance Summary", "Closing Balance", "", "0.00"],
			[...CONTEXT, "Totals", "Total Inflows", "", "4500.00"],
			[...CONTEXT, "Totals", "Total Outflows", "", "1500.00"],
			[...CONTEXT, "Totals", "Net Cash Flow", "", "3000.00"],
			[...CONTEXT, "Cash Inflows", "Rent Received", "100.0", "4500.00"],
			[...CONTEXT, "Cash Inflows", "Total Inflows", "", "4500.00"],
			[...CONTEXT, "Cash Outflows", "Expenses", "100.0", "1500.00"],
			[...CONTEXT, "Cash Outflows", "Total Outflows", "", "1500.00"],
			[
				...CONTEXT,
				"Cash Flow by Activity",
				"Operating Activities",
				"",
				"3000.00",
			],
			[...CONTEXT, "Cash Flow by Activity", "Financing Activities", "", "0.00"],
			...STATEMENT_BASIS_NOTE.map((entry) => [
				...CONTEXT,
				"Basis of Presentation",
				entry,
				"",
				"",
			]),
		]);
	});

	it("splits a section's share across its lines and totals them", () => {
		const view = buildCashFlowView(
			cashFlowData({
				financingActivities: {
					ownerContributions: 1500,
					netFinancingCash: 1500,
				},
			}),
		);
		const rows = parse(
			buildCashFlowCsv({
				period: "quarterly",
				startDate: "2026-10-01",
				endDate: "2026-12-31",
				view,
			}),
		);
		const section = (name: string) =>
			rows.filter((r) => r[4] === name).map((r) => [r[5], r[6], r[7]]);
		expect(section("Cash Inflows")).toEqual([
			["Rent Received", "75.0", "4500.00"],
			["Owner Funds for Expenses", "25.0", "1500.00"],
			["Total Inflows", "", "6000.00"],
		]);
		expect(section("Cash Outflows")).toEqual([
			["Expenses", "100.0", "1500.00"],
			["Total Outflows", "", "1500.00"],
		]);
		expect(rows[1]?.slice(0, 4)).toEqual([
			"Quarterly",
			"2026-10-01",
			"2026-12-31",
			"USD",
		]);
	});

	it("keeps negative amounts as signed numbers, never formula-prefixed", () => {
		const view = buildCashFlowView(
			cashFlowData({
				netCashFlow: -1234.5,
				operatingActivities: {
					rentalPaymentsReceived: 0,
					expensesPaid: -1234.5,
					netOperatingCash: -1234.5,
				},
			}),
		);
		const rows = parse(
			buildCashFlowCsv({
				period: "monthly",
				startDate: "2026-11-01",
				endDate: "2026-11-30",
				view,
			}),
		);
		const amountOf = (section: string, item: string) =>
			rows.find((r) => r[4] === section && r[5] === item)?.[7];
		expect(amountOf("Balance Summary", "Net Cash Flow")).toBe("-1234.50");
		expect(amountOf("Totals", "Net Cash Flow")).toBe("-1234.50");
		expect(amountOf("Cash Flow by Activity", "Operating Activities")).toBe(
			"-1234.50",
		);
		// Outflow lines are listed positive, as the page shows them.
		expect(amountOf("Cash Outflows", "Expenses")).toBe("1234.50");
	});

	it("neutralizes a text cell that would run as a formula", () => {
		const view: CashFlowView = {
			...buildCashFlowView(cashFlowData()),
			inflowItems: [
				{ category: '=HYPERLINK("http://x","y")', amount: 10, percentage: 50 },
				{ category: "-Refund", amount: 10, percentage: 50 },
			],
		};
		const rows = parse(
			buildCashFlowCsv({
				period: "=cmd",
				startDate: "2026-11-01",
				endDate: "2026-11-30",
				view,
			}),
		);
		const inflowLines = rows.filter((r) => r[4] === "Cash Inflows");
		expect(inflowLines.map((r) => r[5])).toEqual([
			'\'=HYPERLINK("http://x","y")',
			"'-Refund",
			"Total Inflows",
		]);
		expect(rows[1]?.[0]).toBe("'=cmd");
	});

	it("writes the zero totals and no line items for an empty period", () => {
		const rows = parse(
			buildCashFlowCsv({
				period: "yearly",
				startDate: "2024-01-01",
				endDate: "2024-12-31",
				view: buildCashFlowView(
					cashFlowData({
						operatingActivities: {
							rentalPaymentsReceived: 0,
							expensesPaid: 0,
							netOperatingCash: 0,
						},
						netCashFlow: 0,
					}),
				),
			}),
		);
		expect(rows[0]).toEqual([...CASH_FLOW_CSV_HEADER]);
		expect(rows.slice(1).map((r) => [r[4], r[5], r[6], r[7]])).toEqual([
			["Balance Summary", "Opening Balance", "", "0.00"],
			["Balance Summary", "Net Cash Flow", "", "0.00"],
			["Balance Summary", "Closing Balance", "", "0.00"],
			["Totals", "Total Inflows", "", "0.00"],
			["Totals", "Total Outflows", "", "0.00"],
			["Totals", "Net Cash Flow", "", "0.00"],
			["Cash Inflows", "Total Inflows", "", "0.00"],
			["Cash Outflows", "Total Outflows", "", "0.00"],
			["Cash Flow by Activity", "Operating Activities", "", "0.00"],
			["Cash Flow by Activity", "Financing Activities", "", "0.00"],
			...STATEMENT_BASIS_NOTE.map((entry) => [
				"Basis of Presentation",
				entry,
				"",
				"",
			]),
		]);
		expect(rows.slice(1).every((r) => r[0] === "Yearly")).toBe(true);
	});

	it("rejects a date that is not YYYY-MM-DD", () => {
		expect(() =>
			buildCashFlowCsv({
				period: "monthly",
				startDate: "2026-11-1",
				endDate: "2026-11-30",
				view: buildCashFlowView(cashFlowData()),
			}),
		).toThrow(RangeError);
	});
});

describe("cashFlowCsvFilename", () => {
	it("names the file by the range it holds", () => {
		expect(cashFlowCsvFilename("2026-10-01", "2026-12-31")).toBe(
			"tenantflow-cash-flow-2026-10-01-to-2026-12-31.csv",
		);
	});

	it("rejects an impossible date", () => {
		expect(() => cashFlowCsvFilename("2026-02-30", "2026-03-31")).toThrow(
			RangeError,
		);
	});
});

describe("the cash flow's lines", () => {
	it("lists no line or activity the data model has no source for", () => {
		// Each read $0 for every owner: nothing records a purchase, an
		// improvement, a loan, a mortgage payment or a distribution.
		const view = buildCashFlowView(cashFlowData());
		const lines = [...view.inflowItems, ...view.outflowItems].map(
			(i) => i.category,
		);
		for (const gone of [
			"Loan Proceeds",
			"Maintenance Paid",
			"Property Acquisitions",
			"Property Improvements",
			"Mortgage Payments",
			"Owner Distributions",
			"Operating Expenses Paid",
		]) {
			expect(lines).not.toContain(gone);
		}
		expect(Object.keys(view)).not.toContain("netInvestingCash");
	});
});
