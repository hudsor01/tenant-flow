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
import { mapLeaseAnalytics } from "./analytics-mappers";

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
