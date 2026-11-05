/**
 * The executive and financial-performance exports hold the income statement's
 * and the cash flow's figures for the export's own period, and the maintenance
 * and lease portfolio exports say they are to date (66.2-39 fix round 1, part
 * N). Before, the first two printed get_dashboard_stats' scheduled rent times
 * twelve as "Total Income" and "Net Income", and scheduled rent less a twelfth
 * of the period's expenses as "Cash Flow"; the other two printed the period
 * the page offered over figures computed with no period at all.
 *
 * Each test runs the export builder and the pages' own query (financialQueries
 * through their view builders) against the same RPC answers, so a figure in
 * the file is the figure on the screen.
 */

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCashFlowView } from "#app/(owner)/reports/cash-flow/cash-flow-view";
import { buildIncomeStatementView } from "#app/(owner)/reports/income-statement/income-statement-view";
import { financialQueries } from "#hooks/api/query-keys/financial-keys";
import { formatCurrency } from "#lib/utils/currency";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
vi.mock("#lib/supabase/client", async () => {
	const { pagedRpc } = await import("#test/mocks/paged-rpc");
	const { deletedPropertiesFrom } = await import(
		"#test/mocks/deleted-properties"
	);
	return {
		createClient: () => ({
			rpc: pagedRpc(mockRpc),
			from: deletedPropertiesFrom(),
		}),
	};
});
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));

import { buildReportData, type ReportSection } from "../report-data";
import { STATEMENT_BASIS_NOTE } from "../statement-basis";

const START = "2026-02-01";
const END = "2026-03-31";

/** The ledger as of a date, every figure the statements read. */
function position(at: number) {
	return {
		collectedTotal: at,
		unpaidTotal: 145.5,
		creditBalanceTotal: 0,
		chargedTotal: at + 145.5,
		openingTotal: 0,
		rentChargedTotal: at,
		lateFeeChargedTotal: 110,
		manualChargedTotal: 35.5,
		creditTotal: -100,
	};
}

/** Answer the RPCs by name; get_billing_insights by its as-of date. */
function answer(ledger: "ready" | "old") {
	mockRpc.mockImplementation((name: string, args: Record<string, unknown>) => {
		if (name === "get_billing_insights") {
			const asOf = String(args.end_date_param);
			return Promise.resolve({
				// The body before 20261102055449 returns none of these keys.
				data:
					ledger === "old"
						? { totalRevenue: 30000, mrr: 2500, unpaidTotal: 0 }
						: position(asOf === END ? 4515 : 3040),
				error: null,
			});
		}
		if (name === "get_expense_summary") {
			return Promise.resolve({
				data: {
					total_amount: 260.5,
					categories: [{ category: "Plumber", amount: 260.5, percentage: 100 }],
				},
				error: null,
			});
		}
		if (name === "get_occupancy_trends_optimized") {
			return Promise.resolve({
				data: [
					{
						month: "2026-11",
						occupancy_rate: 75,
						total_units: 4,
						occupied_units: 3,
					},
				],
				error: null,
			});
		}
		if (name === "get_revenue_trends_optimized") {
			return Promise.resolve({ data: [], error: null });
		}
		if (name === "get_maintenance_analytics") {
			return Promise.resolve({
				data: { total_requests: 9, open_requests: 2, avg_resolution_hours: 30 },
				error: null,
			});
		}
		if (name === "get_dashboard_stats") {
			return Promise.resolve({
				data: {
					tenants: { total: 3 },
					leases: { active: 2, expiringSoon: 1 },
				},
				error: null,
			});
		}
		return Promise.reject(new Error(`the export reads no ${name}`));
	});
}

function section(sections: ReportSection[], heading: string): ReportSection {
	const found = sections.find((s) => s.heading === heading);
	if (!found) throw new Error(`no section ${heading}`);
	return found;
}

/** The income statement's and the cash flow's figures, as their pages read them. */
async function screens() {
	const period = { start_date: START, end_date: END };
	const income = await new QueryClient().query(
		financialQueries.incomeStatement(period),
	);
	const cash = await new QueryClient().query(financialQueries.cashFlow(period));
	if (income.status !== "ready" || cash.status !== "ready") {
		throw new Error("expected the ledger's statements");
	}
	return {
		statement: buildIncomeStatementView(income.statement),
		flow: buildCashFlowView(cash.report),
	};
}

// A block, not an expression: Vitest runs a function a hook returns as its
// cleanup, and mockReset() returns the mock.
beforeEach(() => {
	mockRpc.mockReset();
});

describe("the statements' basis of presentation in the generated reports", () => {
	// statement-basis.ts said both reports carry it; neither did (part Q).
	it.each(["executive-monthly", "financial-performance"] as const)(
		"%s closes with the basis, one paragraph an entry",
		async (type) => {
			answer("ready");
			const report = await buildReportData(type, new QueryClient(), START, END);
			expect(report.sections.at(-1)).toEqual({
				heading: "Basis of Presentation",
				paragraphs: STATEMENT_BASIS_NOTE,
			});
		},
	);
});

describe("the executive monthly export", () => {
	it("holds the income statement's and the cash flow's figures for its period", async () => {
		answer("ready");
		const { statement, flow } = await screens();
		const report = await buildReportData(
			"executive-monthly",
			new QueryClient(),
			START,
			END,
		);
		expect(section(report.sections, "Key Metrics").rows).toEqual([
			{ label: "Total Revenue", value: formatCurrency(statement.totalRevenue) },
			{
				label: "Total Expenses",
				value: formatCurrency(statement.totalExpenses),
			},
			{ label: "Net Income", value: formatCurrency(statement.netIncome) },
			{ label: "Net Cash Flow", value: formatCurrency(flow.netCashFlow) },
			{ label: "Occupancy Rate (today)", value: "75.0%" },
			{ label: "Occupied Units (today)", value: "3 of 4" },
		]);
		// The ledger's own figures, not scheduled rent: rent received 1475.00.
		expect(flow.netCashFlow).toBe(1475);
		expect(section(report.sections, "Key Metrics").note).toBeUndefined();
		expect(mockRpc).not.toHaveBeenCalledWith(
			"get_dashboard_stats",
			expect.anything(),
		);
	});

	it("writes Unavailable, and says why, when the ledger reports no totals", async () => {
		answer("old");
		const report = await buildReportData(
			"executive-monthly",
			new QueryClient(),
			START,
			END,
		);
		const metrics = section(report.sections, "Key Metrics");
		expect(metrics.rows?.slice(0, 4)).toEqual([
			{ label: "Total Revenue", value: "Unavailable" },
			{ label: "Total Expenses", value: "Unavailable" },
			{ label: "Net Income", value: "Unavailable" },
			{ label: "Net Cash Flow", value: "Unavailable" },
		]);
		expect(metrics.note).toContain("rent ledger");
		expect(JSON.stringify(report)).not.toContain("$0.00");
	});
});

describe("the financial performance export", () => {
	it("holds the income statement's and the cash flow's figures and revenue lines", async () => {
		answer("ready");
		const { statement, flow } = await screens();
		const report = await buildReportData(
			"financial-performance",
			new QueryClient(),
			START,
			END,
		);
		expect(section(report.sections, "Summary").rows).toEqual([
			{ label: "Total Revenue", value: formatCurrency(statement.totalRevenue) },
			{
				label: "Total Expenses",
				value: formatCurrency(statement.totalExpenses),
			},
			{ label: "Net Income", value: formatCurrency(statement.netIncome) },
			{ label: "Net Cash Flow", value: formatCurrency(flow.netCashFlow) },
			{ label: "Occupancy Rate (today)", value: "75.0%" },
		]);
		expect(section(report.sections, "Revenue (charged)").table?.rows).toEqual(
			statement.revenueItems.map((i) => [i.label, formatCurrency(i.amount)]),
		);
		expect(section(report.sections, "Expenses by Vendor").table).toEqual({
			headers: ["Vendor", "Amount", "% of Expenses"],
			rows: [["Plumber", "$260.50", "100.0%"]],
		});
		// No literal or empty section: the monthly breakdown and the rent roll
		// had no source.
		expect(report.sections.map((s) => s.heading)).toEqual([
			"Summary",
			"Revenue (charged)",
			"Expenses by Vendor",
			"Basis of Presentation",
		]);
		expect(JSON.stringify(report)).not.toMatch(
			/Total Income|"Cash Flow"|Rent Roll/,
		);
	});

	it("writes Unavailable, never $0, when the ledger reports no totals", async () => {
		answer("old");
		const report = await buildReportData(
			"financial-performance",
			new QueryClient(),
			START,
			END,
		);
		const summary = section(report.sections, "Summary");
		expect(summary.rows?.slice(0, 4).map((r) => r.value)).toEqual([
			"Unavailable",
			"Unavailable",
			"Unavailable",
			"Unavailable",
		]);
		expect(summary.note).toContain("rent ledger");
		expect(section(report.sections, "Revenue (charged)").table?.rows).toEqual(
			[],
		);
	});
});

describe("the reports whose RPCs take no dates say they are to date", () => {
	it("writes the maintenance report as to date, never the offered period", async () => {
		answer("ready");
		const report = await buildReportData(
			"maintenance-operations",
			new QueryClient(),
			START,
			END,
		);
		expect(report.subtitle).toContain("To date, as of Mar 31, 2026");
		expect(report.subtitle).not.toContain("Feb 1, 2026");
		expect(
			section(report.sections, "Operations Summary").rows?.slice(0, 3),
		).toEqual([
			{ label: "Total Requests to Date", value: "9" },
			{ label: "Open Requests (now)", value: "2" },
			{ label: "Avg Resolution Time to Date", value: "30.0 hours" },
		]);
		expect(report.sections.map((s) => s.heading)).toContain(
			"By Status (to date)",
		);
		expect(mockRpc).toHaveBeenCalledWith("get_maintenance_analytics", {
			user_id: "owner-1",
		});
	});

	it("writes the lease portfolio as to date, with no figure it has no source for", async () => {
		answer("ready");
		const report = await buildReportData(
			"lease-portfolio",
			new QueryClient(),
			START,
			END,
		);
		expect(report.subtitle).toContain("To date, as of Mar 31, 2026");
		expect(report.sections).toEqual([
			{
				heading: "Lease Summary",
				rows: [
					{ label: "Total Tenants", value: "3" },
					{ label: "Active Leases", value: "2" },
					{ label: "Active Leases Ending Within 30 Days", value: "1" },
				],
			},
		]);
	});
});
