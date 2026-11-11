/**
 * Unit tests for `mapOccupancyAnalytics` — the typed
 * RPC→OccupancyAnalyticsPageData boundary mapper (DATA-01). The occupancy RPC
 * returns a jsonb ARRAY; the mapper never throws and degrades non-array / empty
 * input to a safe empty shape.
 */

import { describe, expect, it } from "vitest";
import {
	mapFinancialOverview,
	mapLeaseProfitability,
	mapMaintenanceAnalytics,
	mapMetricTrend,
	mapOccupancyAnalytics,
	mapPortfolioTrends,
} from "./analytics-mappers";

/**
 * DATA-01: `get_occupancy_trends_optimized` returns a jsonb ARRAY ordered
 * month DESC — element[0] is the latest month. These tests pin the trend
 * mapping (one OccupancyTrendPoint per row, oldest first, and nothing beside
 * the trends) and the degrade-to-empty contract on non-array / empty input.
 */
describe("mapOccupancyAnalytics", () => {
	const rows = [
		// element[0] = latest month (RPC orders DESC)
		{
			month: "2024-03",
			occupancy_rate: 90,
			total_units: 20,
			occupied_units: 18,
		},
		{
			month: "2024-02",
			occupancy_rate: 85,
			total_units: 20,
			occupied_units: 17,
		},
	];

	it("maps every row to a trend point (oldest-first for the chart), and carries only them", () => {
		const mapped = mapOccupancyAnalytics(rows);
		// trends are reversed to oldest->newest so the chart x-axis runs forward in
		// time; input rows are newest-first (RPC DESC).
		expect(mapped.trends).toEqual([
			{ period: "2024-02", occupancyRate: 85 },
			{ period: "2024-03", occupancyRate: 90 },
		]);
		// The chart's series alone: the metrics (zeros but one), per-property,
		// seasonal and vacancy fields no source filled and no screen read went
		// in 66.2-39, and each month's unit counts, which the chart never read,
		// in fix round 3.
		expect(Object.keys(mapped)).toEqual(["trends"]);
	});

	it("coerces string-typed numeric fields via Number()", () => {
		const mapped = mapOccupancyAnalytics([
			{
				month: "2024-03",
				occupancy_rate: "75",
				total_units: "20",
				occupied_units: "15",
			},
		]);
		expect(mapped.trends[0]).toEqual({ period: "2024-03", occupancyRate: 75 });
	});

	it("degrades to empty trends on an empty array", () => {
		expect(mapOccupancyAnalytics([])).toEqual({ trends: [] });
	});

	it("degrades to the safe empty shape on non-array input", () => {
		for (const bad of [null, undefined, {}, "nope", 42]) {
			expect(mapOccupancyAnalytics(bad)).toEqual({ trends: [] });
		}
	});
});

describe("mapFinancialOverview (TYPE-02)", () => {
	it("derives metrics from the RPC overview keys (dollars, no /100)", () => {
		const mapped = mapFinancialOverview({
			overview: {
				total_revenue: 120000,
				total_expenses: 30000,
				net_income: 90000,
			},
		});
		expect(mapped.metrics.totalRevenue).toBe(120000);
		expect(mapped.metrics.netIncome).toBe(90000);
		expect(mapped.metrics.profitMargin).toBeCloseTo(75);
		// The four figures the stat cards show: no cash figure (the overview has
		// no cash source; it showed netIncome) and no expense total (no card
		// shows one; Scheduled Net is the revenue less it).
		expect(Object.keys(mapped.metrics).sort()).toEqual([
			"netIncome",
			"profitMargin",
			"totalCollected",
			"totalRevenue",
		]);
	});

	it("builds monthlyMetrics from the revenue rows joined with expense totals", () => {
		const mapped = mapFinancialOverview(
			{ overview: { total_revenue: 40000, total_expenses: 10000 } },
			{
				revenueRows: [{ month: "2024-01", revenue: 40000 }],
				expenseSummary: {
					monthly_totals: [{ month: "2024-01", amount: 10000 }],
					categories: [{ category: "Acme", amount: 10000, percentage: 100 }],
				},
			},
		);
		// Each series holds what its chart or list reads, and nothing else.
		expect(mapped.monthlyMetrics).toEqual([
			{ month: "2024-01", revenue: 40000, expenses: 10000, netIncome: 30000 },
		]);
		expect(mapped.netOperatingIncome).toEqual([
			{ propertyName: "2024-01", noi: 30000 },
		]);
		expect(mapped.breakdown).toEqual({
			expenses: [{ label: "Acme", value: 10000, change: null }],
		});
	});

	it("degrades to zeroed metrics + empty charts on non-object input (never throws)", () => {
		for (const input of [null, undefined, "x", [1, 2], 5]) {
			const mapped = mapFinancialOverview(input);
			expect(mapped.metrics.totalRevenue).toBe(0);
			expect(mapped.metrics.netIncome).toBe(0);
			expect(mapped.monthlyMetrics).toEqual([]);
		}
	});

	// D-07: Scheduled (lease-derived) and Collected (ledger receipts) are two
	// distinct figures. Summing them, or re-basing profit on Collected, is the
	// double-count this phase exists to prevent.
	it("sums Collected from ledger receipts WITHOUT folding it into Scheduled", () => {
		const mapped = mapFinancialOverview(
			{
				overview: {
					total_revenue: 120000,
					total_expenses: 30000,
					net_income: 90000,
				},
			},
			{
				revenueRows: [
					{ month: "2024-01", revenue: 10000, collections: 9000 },
					{ month: "2024-02", revenue: 10000, collections: 8500 },
				],
			},
		);
		expect(mapped.metrics.totalCollected).toBe(17500);
		// Scheduled is untouched, and nothing anywhere equals scheduled+collected.
		expect(mapped.metrics.totalRevenue).toBe(120000);
		expect(mapped.metrics.netIncome).toBe(90000);
		for (const value of Object.values(mapped.metrics)) {
			expect(value).not.toBe(137500);
		}
	});

	it("reports an honest zero Collected when the ledger has no receipts", () => {
		const mapped = mapFinancialOverview(
			{ overview: { total_revenue: 120000 } },
			{ revenueRows: [{ month: "2024-01", revenue: 10000, collections: 0 }] },
		);
		expect(mapped.metrics.totalCollected).toBe(0);
	});

	it("treats a missing collections field as zero, never as scheduled", () => {
		const mapped = mapFinancialOverview(
			{ overview: { total_revenue: 120000 } },
			{ revenueRows: [{ month: "2024-01", revenue: 10000 }] },
		);
		expect(mapped.metrics.totalCollected).toBe(0);
	});
});

/** get_maintenance_analytics as 20261110123122 returns it, cut to two months. */
const COMPUTED_MAINTENANCE = {
	open_requests: 2,
	avg_resolution_hours: 30,
	by_status: [{ status: "open", count: 2 }],
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
	trendsOverTime: [
		{ month: "2026-09", completed: 1, pending: 4, avg_resolution_hours: 48.33 },
		{ month: "2026-10", completed: 1, pending: 4, avg_resolution_hours: null },
	],
};

describe("mapLeaseProfitability (20261110123124)", () => {
	const raw = {
		overview: { total_revenue: 1, total_expenses: 0, net_income: 1 },
		lease_profitability: {
			window: "2026-01-01/2026-11-02",
			leases: [
				{
					lease_id: "l8",
					property_name: "South House",
					property_deleted: true,
					unit_number: "S1",
					tenant_name: "Ed South",
					rent_received: 5000,
					expenses: 0,
					net: 5000,
				},
				{
					lease_id: "l2",
					property_name: "Lot 9",
					property_deleted: false,
					unit_number: null,
					tenant_name: null,
					rent_received: 0,
					expenses: 30,
					net: -30,
				},
			],
		},
	};

	it("reads each lease and the period, a deleted property named so", () => {
		expect(mapLeaseProfitability(raw)).toEqual({
			status: "ready",
			window: { start_date: "2026-01-01", end_date: "2026-11-02" },
			leases: [
				{
					propertyName: "South House (deleted)",
					unitNumber: "S1",
					tenantName: "Ed South",
					rentReceived: 5000,
					expenses: 0,
					net: 5000,
				},
				{
					propertyName: "Lot 9",
					unitNumber: null,
					tenantName: null,
					rentReceived: 0,
					expenses: 30,
					net: -30,
				},
			],
		});
	});

	it.each([
		["the body before 20261110123124 (no key)", { overview: raw.overview }],
		[
			"a period that is not stated",
			{ lease_profitability: { ...raw.lease_profitability, window: "ytd" } },
		],
		["no payload", null],
	])("says the table is unavailable from %s, never empty", (_what, value) => {
		expect(mapLeaseProfitability(value)).toEqual({ status: "unavailable" });
	});
});

describe("mapMetricTrend (20261110123118)", () => {
	const WINDOW = "2026-10-03/2026-11-02";
	const raw = {
		current: 4,
		previous: 3,
		change: 1,
		percentChange: 33.33,
		trend: "up",
		window: WINDOW,
	};

	it("reads a trend and the window it computes", () => {
		expect(mapMetricTrend(raw)).toEqual({
			current: 4,
			previous: 3,
			change: 1,
			percentChange: 33.33,
			trend: "up",
			window: { start_date: "2026-10-03", end_date: "2026-11-02" },
		});
	});

	it("keeps a NULL percentChange (no prior figure) null, never 0", () => {
		expect(
			mapMetricTrend({ ...raw, previous: 0, percentChange: null }),
		).toMatchObject({ previous: 0, percentChange: null });
	});

	it("states no window from a body that states none (the body before)", () => {
		const { window: _omit, ...old } = raw;
		expect(mapMetricTrend({ ...old, percentChange: 0 })).toMatchObject({
			window: null,
		});
	});

	it.each([
		["no payload", undefined],
		["not an object", 3],
		["no current figure", { change: 1 }],
	])("reads %s as no trend", (_what, value) => {
		expect(mapMetricTrend(value)).toBeNull();
	});
});

describe("mapPortfolioTrends (20261110123118)", () => {
	const WINDOW = "2026-10-03/2026-11-02";
	const days = { start_date: "2026-10-03", end_date: "2026-11-02" };

	it("reads each change beside its stated window", () => {
		expect(
			mapPortfolioTrends({
				units: { occupancyChange: -25, occupancyChangeWindow: WINDOW },
				revenue: { growth: -10.18, growthWindow: WINDOW },
			}),
		).toEqual({
			occupancy: { status: "ready", points: -25, window: days },
			revenue: { status: "ready", percent: -10.18, window: days },
		});
	});

	it("keeps a null growth as no prior figure, not 0", () => {
		expect(
			mapPortfolioTrends({
				units: { occupancyChange: 100, occupancyChangeWindow: WINDOW },
				revenue: { growth: null, growthWindow: WINDOW },
			}).revenue,
		).toEqual({ status: "ready", percent: null, window: days });
	});

	it("reads a figure with no window as unavailable (the bodies before)", () => {
		// get_dashboard_stats' literals, and get_dashboard_data_v2's comparison
		// against only the leases still active today.
		for (const stats of [
			{ units: { occupancyChange: 0 }, revenue: { growth: 0 } },
			{ units: { occupancyChange: 25 }, revenue: { growth: 100 } },
			{
				units: { occupancyChange: 25, occupancyChangeWindow: "30d" },
				revenue: { growth: 1, growthWindow: null },
			},
			null,
			[],
		]) {
			expect(mapPortfolioTrends(stats), JSON.stringify(stats)).toEqual({
				occupancy: { status: "unavailable" },
				revenue: { status: "unavailable" },
			});
		}
	});

	it("reads a window with no figure as unavailable", () => {
		expect(
			mapPortfolioTrends({
				units: { occupancyChange: "-25", occupancyChangeWindow: WINDOW },
				revenue: { growthWindow: WINDOW },
			}),
		).toEqual({
			occupancy: { status: "unavailable" },
			revenue: { status: "unavailable" },
		});
	});
});

describe("mapMaintenanceAnalytics (TYPE-03)", () => {
	it("derives categoryBreakdown from the RPC's real keys, and carries only what a screen renders", () => {
		const mapped = mapMaintenanceAnalytics({
			open_requests: 4,
			avg_resolution_hours: 12,
			by_status: [
				{ status: "open", count: 4 },
				{ status: "in_progress", count: 2 },
				{ status: "completed", count: 9 },
			],
		});
		expect(mapped.categoryBreakdown).toContainEqual({
			category: "open",
			count: 4,
		});
		// No costed_requests: the body before 20261110123122, whose costs are
		// literals. No cost, no trend series, never $0 or an empty chart.
		expect(mapped.costs).toBeNull();
		expect(mapped.trends).toBeNull();
		expect(mapped.costBreakdown).toEqual([]);
		// No metrics, cost trends, response times or preventive maintenance:
		// written as 0 or [] and read by no screen, they went in 66.2-39.
		expect(Object.keys(mapped).sort()).toEqual([
			"categoryBreakdown",
			"costBreakdown",
			"costs",
			"trends",
		]);
	});

	it("does not read the old body's literal costs as figures", () => {
		const mapped = mapMaintenanceAnalytics({
			open_requests: 1,
			total_cost: 0,
			average_cost: 0,
			monthly_cost: [],
			vendor_performance: [],
			trendsOverTime: [],
		});
		expect(mapped.costs).toBeNull();
		expect(mapped.trends).toBeNull();
	});

	it("reads the spend and the trends 20261110123122 computes", () => {
		const mapped = mapMaintenanceAnalytics(COMPUTED_MAINTENANCE);
		expect(mapped.costs).toEqual({
			totalCost: 790.5,
			costedRequests: 4,
			averageCost: 197.63,
			monthlyCost: [
				{ month: "2026-09", cost: 250.5 },
				{ month: "2026-10", cost: 110 },
			],
			vendors: [
				{ vendorName: "Roof Co", totalSpend: 400, jobs: 1 },
				{ vendorName: "Plumber", totalSpend: 260.5, jobs: 2 },
			],
		});
		expect(mapped.costBreakdown).toEqual([
			{ category: "Roof Co", amount: 400 },
			{ category: "Plumber", amount: 260.5 },
		]);
		expect(mapped.trends).toEqual([
			{ period: "2026-09", completed: 1, pending: 4 },
			{ period: "2026-10", completed: 1, pending: 4 },
		]);
	});

	it("keeps a null average and empty series when no request has a cost", () => {
		const mapped = mapMaintenanceAnalytics({
			...COMPUTED_MAINTENANCE,
			total_cost: 0,
			costed_requests: 0,
			average_cost: null,
			vendor_performance: [],
		});
		expect(mapped.costs?.averageCost).toBeNull();
		expect(mapped.costs?.costedRequests).toBe(0);
		expect(mapped.costBreakdown).toEqual([]);
	});

	it("degrades to safe empty on non-object input (never throws)", () => {
		for (const input of [null, undefined, "x", 5]) {
			const mapped = mapMaintenanceAnalytics(input);
			expect(mapped.categoryBreakdown).toEqual([]);
			expect(mapped.costs).toBeNull();
		}
	});
});
