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
		// The RPC carries no cost/trend series — those stay honestly empty.
		expect(mapped.costTrends).toEqual([]);
		expect(mapped.trends).toEqual([]);
	});

	it("degrades to safe empty on non-object input (never throws)", () => {
		for (const input of [null, undefined, "x", 5]) {
			const mapped = mapMaintenanceAnalytics(input);
			expect(mapped.metrics.openRequests).toBe(0);
			expect(mapped.categoryBreakdown).toEqual([]);
		}
	});
});
