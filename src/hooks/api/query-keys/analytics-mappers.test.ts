/**
 * Unit tests for `mapOccupancyAnalytics` — the typed
 * RPC→OccupancyAnalyticsPageData boundary mapper (DATA-01). The occupancy RPC
 * returns a jsonb ARRAY; the mapper never throws and degrades non-array / empty
 * input to a safe empty shape.
 */

import { describe, expect, it } from "vitest";
import {
	mapFinancialOverview,
	mapMaintenanceAnalytics,
	mapOccupancyAnalytics,
	mapPortfolioTrends,
} from "./analytics-mappers";

/**
 * DATA-01: `get_occupancy_trends_optimized` returns a jsonb ARRAY ordered
 * month DESC — element[0] is the latest month. These tests pin the trend
 * mapping (one OccupancyTrendPoint per row) and the element[0] metric
 * derivation, plus the degrade-to-empty contract on non-array / empty input.
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

	it("maps every row to a trend point (oldest-first for the chart) and derives metrics from element[0]", () => {
		const mapped = mapOccupancyAnalytics(rows);
		// trends are reversed to oldest->newest so the chart x-axis runs forward in
		// time; input rows are newest-first (RPC DESC).
		expect(mapped.trends).toEqual([
			{
				period: "2024-02",
				occupancyRate: 85,
				occupiedUnits: 17,
				totalUnits: 20,
			},
			{
				period: "2024-03",
				occupancyRate: 90,
				occupiedUnits: 18,
				totalUnits: 20,
			},
		]);
		// metrics still derive from element[0] of the ORIGINAL (DESC) input = latest.
		expect(mapped.metrics.currentOccupancy).toBe(90);
		expect(mapped.metrics.averageVacancyDays).toBe(0);
		expect(mapped.metrics.seasonalPeakOccupancy).toBe(0);
		expect(mapped.metrics.trend).toBe(0);
		// RPC provides none of these
		expect(mapped.propertyPerformance).toEqual([]);
		expect(mapped.seasonalPatterns).toEqual([]);
		expect(mapped.vacancyAnalysis).toEqual([]);
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
		expect(mapped.trends[0]).toEqual({
			period: "2024-03",
			occupancyRate: 75,
			occupiedUnits: 15,
			totalUnits: 20,
		});
		expect(mapped.metrics.currentOccupancy).toBe(75);
	});

	it("degrades to zeroed metrics + empty trends on an empty array", () => {
		const mapped = mapOccupancyAnalytics([]);
		expect(mapped.trends).toEqual([]);
		expect(mapped.metrics.currentOccupancy).toBe(0);
	});

	it("degrades to the safe empty shape on non-array input", () => {
		for (const bad of [null, undefined, {}, "nope", 42]) {
			const mapped = mapOccupancyAnalytics(bad);
			expect(mapped.trends).toEqual([]);
			expect(mapped.metrics.currentOccupancy).toBe(0);
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
		expect(mapped.metrics.totalExpenses).toBe(30000);
		expect(mapped.metrics.netIncome).toBe(90000);
		expect(mapped.metrics.cashFlow).toBe(90000);
		expect(mapped.metrics.profitMargin).toBeCloseTo(75);
	});

	it("builds monthlyMetrics from the revenue rows joined with expense totals", () => {
		const mapped = mapFinancialOverview(
			{ overview: { total_revenue: 40000, total_expenses: 10000 } },
			{
				revenueRows: [{ month: "2024-01", revenue: 40000 }],
				expenseSummary: {
					monthly_totals: [{ month: "2024-01", amount: 10000 }],
				},
			},
		);
		expect(mapped.monthlyMetrics).toHaveLength(1);
		expect(mapped.monthlyMetrics[0]).toMatchObject({
			month: "2024-01",
			revenue: 40000,
			expenses: 10000,
			netIncome: 30000,
		});
		expect(mapped.breakdown.expenses.length).toBeGreaterThanOrEqual(0);
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
		expect(mapped.metrics.cashFlow).toBe(90000);
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

/** get_maintenance_analytics as 20261102184503 returns it, cut to two months. */
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

describe("mapPortfolioTrends (20261102184501)", () => {
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
	it("derives metrics and categoryBreakdown from the RPC's real keys", () => {
		const mapped = mapMaintenanceAnalytics({
			open_requests: 4,
			avg_resolution_hours: 12,
			by_status: [
				{ status: "open", count: 4 },
				{ status: "in_progress", count: 2 },
				{ status: "completed", count: 9 },
			],
		});
		expect(mapped.metrics.openRequests).toBe(4);
		expect(mapped.metrics.inProgressRequests).toBe(2);
		expect(mapped.metrics.completedRequests).toBe(9);
		expect(mapped.metrics.averageResponseTimeHours).toBe(12);
		expect(mapped.categoryBreakdown).toContainEqual({
			category: "open",
			count: 4,
		});
		// No costed_requests: the body before 20261102184503, whose costs are
		// literals. No cost, no trend series, never $0 or an empty chart.
		expect(mapped.costs).toBeNull();
		expect(mapped.trends).toBeNull();
		expect(mapped.costBreakdown).toEqual([]);
		expect(mapped.costTrends).toEqual([]);
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

	it("reads the spend and the trends 20261102184503 computes", () => {
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
			{ category: "Roof Co", amount: 400, percentage: (400 / 790.5) * 100 },
			{ category: "Plumber", amount: 260.5, percentage: (260.5 / 790.5) * 100 },
		]);
		expect(mapped.trends).toEqual([
			{ period: "2026-09", completed: 1, pending: 4, avgResolutionTime: 48.33 },
			{ period: "2026-10", completed: 1, pending: 4, avgResolutionTime: null },
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
			expect(mapped.metrics.openRequests).toBe(0);
			expect(mapped.categoryBreakdown).toEqual([]);
		}
	});
});
