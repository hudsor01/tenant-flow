/**
 * The generated (PDF/Excel) reports write each property's rent received, over
 * the report's own period.
 *
 * The property portfolio export used to call get_property_performance_analytics
 * with no window (the last 30 days, whatever period was picked) and print its
 * `0::numeric` revenue as "Revenue" and expenses-negated as "NOI". It now asks
 * for the period, writes "Rent Received" and "Net Income", and writes
 * "Unavailable" with a note, never $0, when the server's body predates
 * 20261102163709.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc, mockDeleted } = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	/** The owner's deleted property ids the code reads: none by default. */
	mockDeleted: vi.fn((): { id: string }[] => []),
}));
vi.mock("#lib/supabase/client", async () => {
	const { pagedRpc } = await import("#test/mocks/paged-rpc");
	const { deletedPropertiesFrom } = await import(
		"#test/mocks/deleted-properties"
	);
	return {
		createClient: () => ({
			rpc: pagedRpc(mockRpc),
			from: deletedPropertiesFrom(mockDeleted()),
		}),
	};
});
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));

import { buildReportData, type ReportSection } from "../report-data";

type Answers = Record<string, unknown>;

function answer(answers: Answers) {
	mockRpc.mockImplementation((name: string) =>
		Promise.resolve({ data: answers[name] ?? null, error: null }),
	);
}

function section(sections: ReportSection[], heading: string): ReportSection {
	const found = sections.find((s) => s.heading === heading);
	if (!found) throw new Error(`no section ${heading}`);
	return found;
}

const PROPERTY = {
	property_id: "p1",
	property_name: "Alpha Court",
	occupancy_rate: 50,
	total_revenue: 2750.5,
	total_expenses: 200.25,
	net_income: 2550.25,
};

describe("the property portfolio report", () => {
	beforeEach(() => mockRpc.mockReset());

	it("writes rent received and net income over the report's period", async () => {
		answer({
			get_property_performance_analytics: [
				{ ...PROPERTY, timeframe: "2025-01-01/2025-12-31" },
			],
			get_occupancy_trends_optimized: [],
		});
		const report = await buildReportData(
			"property-portfolio",
			new QueryClient(),
			"2025-01-01",
			"2025-12-31",
		);
		expect(mockRpc).toHaveBeenCalledWith("get_property_performance_analytics", {
			p_user_id: "owner-1",
			p_timeframe: "2025-01-01..2025-12-31",
		});
		const table = section(report.sections, "Property Performance");
		// No Vacant column: no source fills it (it read 0). Occupancy is today's.
		expect(table.table?.headers).toEqual([
			"Property",
			"Occupancy (today)",
			"Rent Received",
			"Expenses",
			"Net Income",
		]);
		// To the cent, so the row ties: $2,750.50 - $200.25 = $2,550.25 (whole
		// dollars wrote $2,751 - $200 = $2,550).
		expect(table.table?.rows).toEqual([
			["Alpha Court", "50.0%", "$2,750.50", "$200.25", "$2,550.25"],
		]);
		expect(report.sections.map((s) => s.heading)).toEqual([
			"Portfolio Summary",
			"Property Performance",
		]);
		expect(table.note).toBeUndefined();
	});

	it("names a property deleted since and leaves it out of the portfolio's count", async () => {
		answer({
			get_property_performance_analytics: [
				{ ...PROPERTY, timeframe: "2025-01-01/2025-12-31" },
				{
					...PROPERTY,
					property_id: "p3",
					property_name: "Gamma Flats",
					occupancy_rate: 100,
					timeframe: "2025-01-01/2025-12-31",
				},
			],
			get_occupancy_trends_optimized: [],
		});
		mockDeleted.mockReturnValue([{ id: "p3" }]);
		try {
			const report = await buildReportData(
				"property-portfolio",
				new QueryClient(),
				"2025-01-01",
				"2025-12-31",
			);
			const rows = section(report.sections, "Property Performance").table?.rows;
			expect(rows?.map((r) => r[0])).toEqual([
				"Alpha Court",
				"Gamma Flats (deleted)",
			]);
			expect(section(report.sections, "Portfolio Summary").rows?.[0]).toEqual({
				label: "Total Properties",
				value: "1",
			});
		} finally {
			mockDeleted.mockReturnValue([]);
		}
	});

	it("writes Unavailable, and says why, from the body before 20261102163709", async () => {
		answer({
			get_property_performance_analytics: [
				{
					...PROPERTY,
					total_revenue: 0,
					net_income: -200.25,
					timeframe: "2025-01-01..2025-12-31",
				},
			],
			get_occupancy_trends_optimized: [],
		});
		const report = await buildReportData(
			"property-portfolio",
			new QueryClient(),
			"2025-01-01",
			"2025-12-31",
		);
		const table = section(report.sections, "Property Performance");
		expect(table.table?.rows).toEqual([
			["Alpha Court", "50.0%", "Unavailable", "Unavailable", "Unavailable"],
		]);
		// Each of the row's three figures reads Unavailable, so the note names
		// all three (cycle 2, F123).
		expect(table.note).toBe(
			"Rent received, expenses and net income by property aren't available yet: the server's property figures are pending an update.",
		);
	});
});

describe("the tax preparation report", () => {
	beforeEach(() => mockRpc.mockReset());

	function answerTaxYear(collected: number | undefined, timeframe: string) {
		mockRpc.mockImplementation(
			(name: string, args: Record<string, unknown>) => {
				if (name === "get_billing_insights") {
					const total =
						collected === undefined
							? undefined
							: args.end_date_param === "2025-12-31"
								? collected
								: 1000;
					return Promise.resolve({
						data: total === undefined ? {} : { collectedTotal: total },
						error: null,
					});
				}
				if (name === "get_expense_summary") {
					return Promise.resolve({
						data: {
							total_amount: 200.25,
							categories: [{ category: "Plumber", amount: 200.25 }],
						},
						error: null,
					});
				}
				return Promise.resolve({
					data: [{ ...PROPERTY, timeframe }],
					error: null,
				});
			},
		);
	}

	it("writes the tax year's rent received, and each property's (Schedule E support)", async () => {
		answerTaxYear(3750.5, "2025-01-01/2025-12-31");
		const report = await buildReportData(
			"tax-preparation",
			new QueryClient(),
			"2025-01-01",
			"2025-12-31",
		);
		// To the cent, as the year-end page prints them: whole dollars rounded
		// each row apart and could not tie the summary to the table.
		expect(section(report.sections, "Annual Summary").rows).toEqual([
			{ label: "Tax Year", value: "2025" },
			{ label: "Rent Received", value: "$2,750.50" },
			{ label: "Operating Expenses", value: "$200.25" },
			{ label: "Net Income", value: "$2,550.25" },
		]);
		const byProperty = section(
			report.sections,
			"Income by Property (Schedule E support)",
		);
		expect(byProperty.table?.headers).toEqual([
			"Property",
			"Rent Received",
			"Expenses",
			"Net Income",
		]);
		expect(byProperty.table?.rows).toEqual([
			["Alpha Court", "$2,750.50", "$200.25", "$2,550.25"],
		]);
		// get_expense_summary's categories are vendor names (part P): the
		// section read "Expense by Category" over a "Category" column.
		expect(
			report.sections.find((s) => s.heading === "Expenses by Vendor")?.table
				?.headers,
		).toEqual(["Vendor", "Amount"]);
		expect(report.sections.map((s) => s.heading)).not.toContain(
			"Expense by Category",
		);
		// TenantFlow does not decide which expenses are deductible: the
		// section says so, in the tax export's own words.
		expect(
			report.sections.find((s) => s.heading === "Expenses by Vendor")?.note,
		).toBe(
			"TenantFlow doesn't decide which expenses are deductible; review them with your tax preparer.",
		);
		expect(mockRpc).toHaveBeenCalledWith("get_property_performance_analytics", {
			p_user_id: "owner-1",
			p_timeframe: "2025-01-01..2025-12-31",
		});
	});

	// The period's end picks the tax year; the figures are that whole calendar
	// year, so the file is headed by it, never by the period (cycle 2, F9).
	it("is headed by its tax year, not the period it was asked for", async () => {
		answerTaxYear(3750.5, "2025-01-01/2025-12-31");
		const report = await buildReportData(
			"tax-preparation",
			new QueryClient(),
			"2025-11-05",
			"2025-12-05",
		);
		expect(report.title).toBe("Tax Preparation — 2025");
		expect(report.subtitle).toBe(
			"Rent received · expenses · property breakdown · Tax year 2025",
		);
		expect([report.periodStart, report.periodEnd]).toEqual([
			"2025-01-01",
			"2025-12-31",
		]);
	});

	it("lists a property deleted after the year, named so, and ties to the cent", async () => {
		// Gamma Flats received 333.00 in 2025 and was deleted since: the
		// summary (3083.50 received) counts it, so the table must list it.
		mockRpc.mockImplementation(
			(name: string, args: Record<string, unknown>) => {
				if (name === "get_billing_insights") {
					return Promise.resolve({
						data: {
							collectedTotal:
								args.end_date_param === "2025-12-31" ? 4083.5 : 1000,
						},
						error: null,
					});
				}
				if (name === "get_expense_summary") {
					return Promise.resolve({
						data: { total_amount: 212.25, categories: [] },
						error: null,
					});
				}
				return Promise.resolve({
					data: [
						{ ...PROPERTY, timeframe: "2025-01-01/2025-12-31" },
						{
							property_id: "p3",
							property_name: "Gamma Flats",
							occupancy_rate: 100,
							total_revenue: 333,
							total_expenses: 12,
							net_income: 321,
							timeframe: "2025-01-01/2025-12-31",
						},
					],
					error: null,
				});
			},
		);
		mockDeleted.mockReturnValue([{ id: "p3" }]);
		try {
			const report = await buildReportData(
				"tax-preparation",
				new QueryClient(),
				"2025-01-01",
				"2025-12-31",
			);
			expect(section(report.sections, "Annual Summary").rows).toEqual([
				{ label: "Tax Year", value: "2025" },
				{ label: "Rent Received", value: "$3,083.50" },
				{ label: "Operating Expenses", value: "$212.25" },
				{ label: "Net Income", value: "$2,871.25" },
			]);
			expect(
				section(report.sections, "Income by Property (Schedule E support)")
					.table?.rows,
			).toEqual([
				["Alpha Court", "$2,750.50", "$200.25", "$2,550.25"],
				["Gamma Flats (deleted)", "$333.00", "$12.00", "$321.00"],
			]);
		} finally {
			mockDeleted.mockReturnValue([]);
		}
	});

	it.each([
		["no ledger totals", undefined, "2025-01-01/2025-12-31"],
		[
			"the property body before 20261102163709",
			3750.5,
			"2025-01-01..2025-12-31",
		],
	])(
		"writes Unavailable, never a zero, from %s",
		async (_what, collected, timeframe) => {
			answerTaxYear(collected, timeframe);
			const report = await buildReportData(
				"tax-preparation",
				new QueryClient(),
				"2025-01-01",
				"2025-12-31",
			);
			expect(report.sections).toEqual([
				{
					heading: "Annual Summary",
					rows: [
						{ label: "Tax Year", value: "2025" },
						{ label: "Rent Received", value: "Unavailable" },
						{ label: "Net Income", value: "Unavailable" },
					],
					note: "Rent received comes from your rent ledger, and its totals aren't available yet.",
				},
			]);
		},
	);
});

describe("the executive monthly report", () => {
	beforeEach(() => mockRpc.mockReset());

	it("labels its monthly series scheduled rent, which is what it sums", async () => {
		mockRpc.mockImplementation((name: string) =>
			Promise.resolve({
				data:
					name === "get_revenue_trends_optimized"
						? [{ month: "2025-12", revenue: 2500 }]
						: name === "get_occupancy_trends_optimized"
							? []
							: { total_amount: 0, categories: [], monthly_totals: [] },
				error: null,
			}),
		);
		const report = await buildReportData(
			"executive-monthly",
			new QueryClient(),
			"2025-12-01",
			"2025-12-31",
		);
		const series = section(report.sections, "Scheduled Rent (last 12 months)");
		expect(series.table?.headers).toEqual(["Month", "Scheduled Rent"]);
		expect(series.table?.rows).toEqual([["2025-12", "$2,500"]]);
		expect(
			report.sections.some((s) => s.heading.startsWith("Monthly Revenue")),
		).toBe(false);
	});
});
