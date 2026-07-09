/**
 * Unit tests for `mapOccupancyAnalytics` — the typed
 * RPC→OccupancyAnalyticsPageData boundary mapper (DATA-01). The occupancy RPC
 * returns a jsonb ARRAY; the mapper never throws and degrades non-array / empty
 * input to a safe empty shape.
 */

import { describe, expect, it } from "vitest";
import { mapOccupancyAnalytics } from "./analytics-mappers";

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
