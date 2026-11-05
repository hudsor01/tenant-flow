/**
 * A generated report's notes sit under the figures they explain (66.2-39,
 * cycle 2, F121).
 *
 * WHAT WENT WRONG. When one read fell back (safeFetch's 42P01 fallback), its
 * note landed on another section: a failed occupancy read left the executive
 * Key Metrics' "Occupancy Rate (today) 0.0%" with no note and told the
 * correctly loaded scheduled rent table that its figures "show as 0"; the
 * financial performance report put it under Expenses by Vendor; the property
 * portfolio's zeros carried none; and a failed maintenance read left the
 * Operations Summary's zeros bare, told an empty table it showed 0, and said
 * the server "does not report" the costs it had failed to read.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const START = "2026-02-01";
const END = "2026-03-31";

const ZEROS =
	"Some figures couldn't be loaded and show as 0 here, which may not be their value. Try generating the report again.";
const TABLE =
	"This table couldn't be loaded, so it lists nothing here. Try generating the report again.";
const COSTS_PENDING =
	"Maintenance costs aren't available yet: the server does not report them, so none is shown.";

const MISSING_RELATION = {
	data: null,
	error: { code: "42P01", message: 'relation "x" does not exist' },
};

const ANSWERS: Record<string, unknown> = {
	get_billing_insights: {
		collectedTotal: 4515,
		unpaidTotal: 145.5,
		creditBalanceTotal: 0,
		chargedTotal: 4660.5,
		openingTotal: 0,
		rentChargedTotal: 4515,
		lateFeeChargedTotal: 110,
		manualChargedTotal: 35.5,
		creditTotal: -100,
	},
	get_expense_summary: {
		total_amount: 260.5,
		categories: [{ category: "Plumber", amount: 260.5, percentage: 100 }],
	},
	get_occupancy_trends_optimized: [
		{ month: "2026-03", occupancy_rate: 75, total_units: 4, occupied_units: 3 },
	],
	get_revenue_trends_optimized: [{ month: "2026-03", revenue: 2500 }],
	get_property_performance_analytics: [
		{
			property_id: "p1",
			property_name: "Alpha Court",
			occupancy_rate: 75,
			total_revenue: 4515,
			total_expenses: 260.5,
			net_income: 4254.5,
			timeframe: `${START}/${END}`,
		},
	],
	get_maintenance_analytics: {
		total_requests: 9,
		open_requests: 2,
		avg_resolution_hours: 30,
		by_status: [{ status: "open", count: 2 }],
		by_priority: [{ priority: "normal", count: 9 }],
		total_cost: 790.5,
		costed_requests: 4,
		average_cost: 197.63,
		monthly_cost: [{ month: "2026-03", cost: 250.5 }],
		vendor_performance: [
			{ vendor_name: "Plumber", total_spend: 260.5, jobs: 2 },
		],
		trendsOverTime: [],
	},
};

/** Answer every RPC, except those named, which fail as a missing relation. */
function answer(
	failing: readonly string[],
	overrides: Record<string, unknown> = {},
) {
	mockRpc.mockImplementation((name: string) => {
		if (failing.includes(name)) return Promise.resolve(MISSING_RELATION);
		const data = name in overrides ? overrides[name] : ANSWERS[name];
		if (data === undefined) {
			return Promise.reject(new Error(`the export reads no ${name}`));
		}
		return Promise.resolve({ data, error: null });
	});
}

function notes(sections: ReportSection[]): Record<string, string | undefined> {
	return Object.fromEntries(sections.map((s) => [s.heading, s.note]));
}

async function build(type: Parameters<typeof buildReportData>[0]) {
	const report = await buildReportData(type, new QueryClient(), START, END);
	return notes(report.sections);
}

beforeEach(() => {
	mockRpc.mockReset();
});

describe("each fallback's note is under the section its read feeds", () => {
	it("executive: a failed occupancy read notes Key Metrics, not the rent table", async () => {
		answer(["get_occupancy_trends_optimized"]);
		const byHeading = await build("executive-monthly");
		expect(byHeading["Key Metrics"]).toBe(ZEROS);
		expect(byHeading["Scheduled Rent (last 12 months)"]).toBeUndefined();
	});

	it("executive: a failed scheduled rent read notes its own table", async () => {
		answer(["get_revenue_trends_optimized"]);
		const byHeading = await build("executive-monthly");
		expect(byHeading["Key Metrics"]).toBeUndefined();
		expect(byHeading["Scheduled Rent (last 12 months)"]).toBe(TABLE);
	});

	it("financial performance: a failed occupancy read notes the Summary", async () => {
		answer(["get_occupancy_trends_optimized"]);
		const byHeading = await build("financial-performance");
		expect(byHeading.Summary).toBe(ZEROS);
		expect(byHeading["Expenses by Vendor"]).toBeUndefined();
	});

	it("property portfolio: a failed occupancy read notes the Portfolio Summary", async () => {
		answer(["get_occupancy_trends_optimized"]);
		const byHeading = await build("property-portfolio");
		expect(byHeading["Portfolio Summary"]).toBe(ZEROS);
		expect(byHeading["Property Performance"]).toBeUndefined();
	});

	it("maintenance: a failed read notes the zeros and each empty table, never 'does not report'", async () => {
		answer(["get_maintenance_analytics"]);
		const byHeading = await build("maintenance-operations");
		expect(byHeading).toEqual({
			"Operations Summary": ZEROS,
			"By Status (to date)": TABLE,
			"By Priority (to date)": TABLE,
			"Monthly Cost (last 12 months)": TABLE,
			"Vendor Spend to Date": TABLE,
		});
	});

	it("maintenance: costs the server cannot report yet are noted beside their rows too", async () => {
		const {
			average_cost: _a,
			costed_requests: _c,
			...older
		} = ANSWERS.get_maintenance_analytics as Record<string, unknown>;
		answer([], {
			get_maintenance_analytics: {
				...older,
				total_cost: 0,
				average_cost: 0,
				monthly_cost: [],
				vendor_performance: [],
			},
		});
		const byHeading = await build("maintenance-operations");
		expect(byHeading).toEqual({
			"Operations Summary": COSTS_PENDING,
			"By Status (to date)": undefined,
			"By Priority (to date)": undefined,
			"Monthly Cost (last 12 months)": COSTS_PENDING,
			"Vendor Spend to Date": COSTS_PENDING,
		});
	});
});
