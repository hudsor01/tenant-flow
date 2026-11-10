/**
 * The maintenance operations report writes the spend get_maintenance_analytics
 * computes (20261110123122), the figures the insights tab shows.
 *
 * Before that migration the RPC returned total_cost and average_cost as the
 * literal 0 and monthly_cost and vendor_performance as [], so the report
 * printed $0.00 and empty cost tables; part K removed the rows. They are back,
 * read through the insights tab's own mapper, and say "Unavailable" with a
 * note, never $0.00, while the server's body still returns the literals.
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

import { costSummaryLine } from "#components/analytics/maintenance-insights-section";
import { mapMaintenanceAnalytics } from "#hooks/api/query-keys/analytics-mappers";
import { formatCurrency } from "#lib/utils/currency";
import { buildReportData, type ReportSection } from "../report-data";

function section(sections: ReportSection[], heading: string): ReportSection {
	const found = sections.find((s) => s.heading === heading);
	if (!found) throw new Error(`no section ${heading}`);
	return found;
}

function row(sections: ReportSection[], label: string): string | number {
	const found = section(sections, "Operations Summary").rows?.find(
		(r) => r.label === label,
	);
	if (!found) throw new Error(`no row ${label}`);
	return found.value;
}

const COMPUTED = {
	total_requests: 9,
	open_requests: 2,
	avg_resolution_hours: 30,
	by_status: [{ status: "open", count: 2 }],
	by_priority: [{ priority: "normal", count: 9 }],
	total_cost: 790.5,
	costed_requests: 4,
	average_cost: 197.63,
	monthly_cost: [
		{ month: "2026-09", cost: 250.5 },
		{ month: "2026-10", cost: 110 },
	],
	vendor_performance: [
		{ vendor_name: "Roof Co", total_spend: 400, jobs: 1 },
		{ vendor_name: "Plumber", total_spend: 260.5, jobs: 2 },
	],
	trendsOverTime: [],
};

async function report(data: unknown) {
	mockRpc.mockResolvedValue({ data, error: null });
	return buildReportData(
		"maintenance-operations",
		new QueryClient(),
		"2026-01-01",
		"2026-11-02",
	);
}

describe("the maintenance operations report", () => {
	beforeEach(() => mockRpc.mockReset());

	it("writes the spend to date, the average and its denominator", async () => {
		const { sections } = await report(COMPUTED);
		expect(row(sections, "Total Cost to Date")).toBe("$790.50");
		expect(row(sections, "Requests with Costs")).toBe("4");
		expect(row(sections, "Average Cost per Request with Costs")).toBe(
			"$197.63",
		);
		expect(
			section(sections, "Monthly Cost (last 12 months)").table?.rows,
		).toEqual([
			["2026-09", "$250.50"],
			["2026-10", "$110.00"],
		]);
		const vendors = section(sections, "Vendor Spend to Date");
		expect(vendors.table?.headers).toEqual(["Vendor", "Jobs", "Total Spend"]);
		expect(vendors.table?.rows).toEqual([
			["Roof Co", "1", "$400.00"],
			["Plumber", "2", "$260.50"],
		]);
		expect(vendors.note).toBeUndefined();
	});

	it("says none is recorded when no request has a cost", async () => {
		const { sections } = await report({
			...COMPUTED,
			total_cost: 0,
			costed_requests: 0,
			average_cost: null,
			vendor_performance: [],
		});
		expect(row(sections, "Total Cost to Date")).toBe("$0.00");
		expect(row(sections, "Average Cost per Request with Costs")).toBe(
			"None recorded",
		);
	});

	it("writes Unavailable, never $0.00, while the server returns the literals", async () => {
		const { sections } = await report({
			...COMPUTED,
			total_cost: 0,
			average_cost: 0,
			costed_requests: undefined,
			monthly_cost: [],
			vendor_performance: [],
		});
		for (const label of [
			"Total Cost to Date",
			"Requests with Costs",
			"Average Cost per Request with Costs",
		]) {
			expect(row(sections, label), label).toBe("Unavailable");
		}
		for (const heading of [
			"Monthly Cost (last 12 months)",
			"Vendor Spend to Date",
		]) {
			expect(section(sections, heading).table?.rows, heading).toEqual([]);
			expect(section(sections, heading).note, heading).toContain(
				"aren't available yet",
			);
		}
		expect(JSON.stringify(sections)).not.toContain("$0.00");
	});

	// The report is to date, with no period; the note said "for this period"
	// and blamed "an RPC that's pending a backend cleanup" (66.2-39 part P).
	it("says a failed read shows 0, with no period and no jargon", async () => {
		// The one failure safeFetch falls back on: a relation the RPC reads is gone.
		mockRpc.mockResolvedValue({
			data: null,
			error: { code: "42P01", message: 'relation "x" does not exist' },
		});
		const { sections } = await buildReportData(
			"maintenance-operations",
			new QueryClient(),
			"2026-01-01",
			"2026-11-02",
		);
		const notes = sections.flatMap((s) => (s.note ? [s.note] : []));
		expect(notes).toContain(
			"Some figures couldn't be loaded and show as 0 here, which may not be their value. Try generating the report again.",
		);
		expect(JSON.stringify(sections)).not.toMatch(
			/this period|backend cleanup|RPC/,
		);
	});

	it("carries the figures the insights tab shows for the same answer", async () => {
		const screen = mapMaintenanceAnalytics(COMPUTED);
		const { sections } = await report(COMPUTED);
		const costs = screen.costs;
		if (!costs || costs.averageCost === null) throw new Error("no costs");
		expect(row(sections, "Total Cost to Date")).toBe(
			formatCurrency(costs.totalCost),
		);
		expect(row(sections, "Average Cost per Request with Costs")).toBe(
			formatCurrency(costs.averageCost),
		);
		expect(costSummaryLine(costs)).toBe(
			`${row(sections, "Total Cost to Date")} to date · ${row(sections, "Average Cost per Request with Costs")} average across ${row(sections, "Requests with Costs")} requests with costs`,
		);
		expect(
			section(sections, "Vendor Spend to Date").table?.rows.map((r) => [
				r[0],
				r[2],
			]),
		).toEqual(
			screen.costBreakdown.map((bar) => [
				bar.category,
				formatCurrency(bar.amount),
			]),
		);
	});
});
