/**
 * Unit tests for `mapLeaseAnalytics` — the typed RPC→LeaseAnalyticsPageData
 * boundary mapper introduced in Phase 2 (TYPE-01).
 *
 * Mirrors the discipline of `document-keys.test.ts`'s `mapDocumentRow`
 * tests, with one key difference: an analytics aggregate's "no data yet"
 * state is a valid render state (per the `jsonObjectOrEmpty` precedent the
 * lease path used before this mapper), so the mapper NEVER throws — it
 * field-validates via Zod `safeParse` and falls back to a safe empty shape
 * on null/undefined/non-object/drifted input. These tests pin both the
 * happy path (well-formed RPC return maps to populated page data) and the
 * drift path (malformed sub-shapes degrade to empty/default, not leaked).
 */

import { describe, expect, it } from "vitest";
import { mapLeaseAnalytics, mapOccupancyAnalytics } from "./analytics-mappers";

const validRaw = {
	metrics: {
		totalLeases: 12,
		activeLeases: 9,
		expiringSoon: 2,
		totalrent_amount: 18500,
		averageLeaseValue: 1541.67,
	},
	profitability: [
		{
			lease_id: "00000000-0000-0000-0000-000000000001",
			propertyName: "Maple Court",
			tenantName: "Jordan Lee",
			rent_amount: 1500,
			outstandingBalance: 0,
			profitabilityScore: 0.82,
		},
	],
	lifecycle: [
		{ period: "2026-01", renewals: 3, expirations: 1, noticesGiven: 2 },
		{ period: "2026-02", renewals: 1, expirations: 0, noticesGiven: 1 },
	],
	statusBreakdown: [
		{ status: "active", count: 9, percentage: 75 },
		{ status: "expiring", count: 2, percentage: 16.67 },
	],
	vacancyTrends: [
		{ period: "2026-01", vacancyRate: 5, turnovers: 1, avgVacancyDays: 12 },
	],
};

const emptyMetrics = {
	totalLeases: 0,
	activeLeases: 0,
	expiringSoon: 0,
	totalrent_amount: 0,
	averageLeaseValue: 0,
};

describe("mapLeaseAnalytics", () => {
	it("maps a fully-valid RPC object to a populated LeaseAnalyticsPageData", () => {
		const mapped = mapLeaseAnalytics(validRaw);

		expect(mapped.metrics).toEqual(validRaw.metrics);
		expect(mapped.profitability).toEqual(validRaw.profitability);
		expect(mapped.vacancyTrends).toEqual(validRaw.vacancyTrends);
		// lifecycle source feeds BOTH lifecycle and renewalRates
		expect(mapped.lifecycle).toEqual(validRaw.lifecycle);
		expect(mapped.renewalRates).toEqual(validRaw.lifecycle);
		// statusBreakdown source feeds BOTH statusBreakdown and leaseDistribution
		expect(mapped.statusBreakdown).toEqual(validRaw.statusBreakdown);
		expect(mapped.leaseDistribution).toEqual(validRaw.statusBreakdown);
	});

	it("returns the safe empty fallback for null without throwing", () => {
		const mapped = mapLeaseAnalytics(null);
		expect(mapped.metrics).toEqual(emptyMetrics);
		expect(mapped.profitability).toEqual([]);
		expect(mapped.renewalRates).toEqual([]);
		expect(mapped.vacancyTrends).toEqual([]);
		expect(mapped.leaseDistribution).toEqual([]);
		expect(mapped.lifecycle).toEqual([]);
		expect(mapped.statusBreakdown).toEqual([]);
	});

	it("returns the safe empty fallback for undefined", () => {
		expect(mapLeaseAnalytics(undefined).metrics).toEqual(emptyMetrics);
		expect(mapLeaseAnalytics(undefined).lifecycle).toEqual([]);
	});

	it("returns the safe empty fallback for an empty object", () => {
		const mapped = mapLeaseAnalytics({});
		expect(mapped.metrics).toEqual(emptyMetrics);
		expect(mapped.profitability).toEqual([]);
		expect(mapped.statusBreakdown).toEqual([]);
	});

	it("returns the safe empty fallback for a non-object primitive", () => {
		expect(mapLeaseAnalytics("not-an-object").metrics).toEqual(emptyMetrics);
		expect(mapLeaseAnalytics(42).metrics).toEqual(emptyMetrics);
		expect(mapLeaseAnalytics(true).lifecycle).toEqual([]);
	});

	it("coerces metrics to the zeroed default when a numeric field is a string", () => {
		const drifted = {
			...validRaw,
			metrics: { ...validRaw.metrics, totalLeases: "12" },
		};
		const mapped = mapLeaseAnalytics(drifted);
		// metrics branch rejected → zeroed default, not leaked
		expect(mapped.metrics).toEqual(emptyMetrics);
		// well-formed sibling branches still map
		expect(mapped.lifecycle).toEqual(validRaw.lifecycle);
		expect(mapped.statusBreakdown).toEqual(validRaw.statusBreakdown);
	});

	it("drops the statusBreakdown branch when a row is missing count", () => {
		const drifted = {
			...validRaw,
			statusBreakdown: [{ status: "active", percentage: 75 }],
		};
		const mapped = mapLeaseAnalytics(drifted);
		expect(mapped.statusBreakdown).toEqual([]);
		expect(mapped.leaseDistribution).toEqual([]);
		// sibling branches unaffected
		expect(mapped.metrics).toEqual(validRaw.metrics);
		expect(mapped.lifecycle).toEqual(validRaw.lifecycle);
	});

	it("drops the lifecycle branch when a row is missing period", () => {
		const drifted = {
			...validRaw,
			lifecycle: [{ renewals: 3, expirations: 1, noticesGiven: 2 }],
		};
		const mapped = mapLeaseAnalytics(drifted);
		expect(mapped.lifecycle).toEqual([]);
		expect(mapped.renewalRates).toEqual([]);
		// sibling branches unaffected
		expect(mapped.statusBreakdown).toEqual(validRaw.statusBreakdown);
	});

	it("allows nullable profitabilityScore (omitted or null)", () => {
		const raw = {
			...validRaw,
			profitability: [
				{
					lease_id: "00000000-0000-0000-0000-000000000001",
					propertyName: "Maple Court",
					tenantName: "Jordan Lee",
					rent_amount: 1500,
					outstandingBalance: 0,
				},
				{
					lease_id: "00000000-0000-0000-0000-000000000002",
					propertyName: "Oak Lane",
					tenantName: "Sam Park",
					rent_amount: 1700,
					outstandingBalance: 200,
					profitabilityScore: null,
				},
			],
		};
		const mapped = mapLeaseAnalytics(raw);
		expect(mapped.profitability).toHaveLength(2);
		expect(mapped.profitability[0]?.profitabilityScore).toBeUndefined();
		expect(mapped.profitability[1]?.profitabilityScore).toBeNull();
	});
});

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

	it("maps every row to a trend point and derives metrics from element[0]", () => {
		const mapped = mapOccupancyAnalytics(rows);
		expect(mapped.trends).toEqual([
			{
				period: "2024-03",
				occupancyRate: 90,
				occupiedUnits: 18,
				totalUnits: 20,
			},
			{
				period: "2024-02",
				occupancyRate: 85,
				occupiedUnits: 17,
				totalUnits: 20,
			},
		]);
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
