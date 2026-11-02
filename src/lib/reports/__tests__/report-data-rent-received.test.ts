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

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ rpc: mockRpc }),
}));
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
		expect(table.table?.headers).toEqual([
			"Property",
			"Occupancy",
			"Vacant",
			"Rent Received",
			"Expenses",
			"Net Income",
		]);
		expect(table.table?.rows).toEqual([
			["Alpha Court", "50.0%", "0", "$2,751", "$200", "$2,550"],
		]);
		expect(table.note).toBeUndefined();
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
			[
				"Alpha Court",
				"50.0%",
				"0",
				"Unavailable",
				"Unavailable",
				"Unavailable",
			],
		]);
		expect(table.note).toContain("Rent received isn't available yet");
	});
});
