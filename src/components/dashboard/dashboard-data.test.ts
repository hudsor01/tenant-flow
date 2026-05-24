import { describe, expect, it } from "vitest";
import type { OwnerDashboardData } from "#hooks/api/use-owner-dashboard";
import { transformDashboardData } from "./dashboard-data";

/**
 * Pins the canonical `transformDashboardData` contract — specifically the
 * Phase 2 (POLISH-10) addition of `open_maintenance` flowing into
 * `portfolioRows[i].maintenanceOpen`.
 *
 * The live `/dashboard` page does NOT consume `transformDashboardData` today
 * — it uses an inline `portfolioData` transform in `dashboard.tsx` plus a
 * re-mapper in `page.tsx` (line numbers omitted to avoid drift; search for
 * the `portfolioPerformance` map in each file). The canonical transform
 * survives as the locked architectural seam per Phase 1 CONTEXT D-10.
 * Phase 3 mounted `<KpiBentoRow>` but explicitly did NOT do the
 * `dashboard-view.tsx` consumer migration; that work is deferred to a
 * later phase (see ROADMAP.md). Without this test, a regression in
 * `transformDashboardData.maintenanceOpen` would not surface until the
 * consumer migration lands.
 */
describe("transformDashboardData", () => {
	const baseProperty = {
		property: "Test Property",
		property_id: "prop-1",
		totalUnits: 10,
		occupiedUnits: 8,
		vacantUnits: 2,
		occupancyRate: 80,
		revenue: 12000,
		monthlyRevenue: 1000,
		potentialRevenue: 1250,
		address_line1: "1 Test St",
		property_type: "APARTMENT",
		status: "PARTIAL" as const,
		trend: "stable" as const,
		trendPercentage: 0,
	};

	const basePayload: OwnerDashboardData = {
		stats: {} as OwnerDashboardData["stats"],
		activity: [],
		metricTrends: {
			occupancyRate: null,
			activeTenants: null,
			monthlyRevenue: null,
			openMaintenance: null,
		},
		timeSeries: {
			occupancyRate: [],
			monthlyRevenue: [],
		},
		propertyPerformance: [],
	};

	it("forwards prop.open_maintenance into portfolioRows[i].maintenanceOpen", () => {
		const payload: OwnerDashboardData = {
			...basePayload,
			propertyPerformance: [{ ...baseProperty, open_maintenance: 3 }],
		};
		const result = transformDashboardData(payload);
		expect(result.portfolioRows).toHaveLength(1);
		expect(result.portfolioRows[0]?.maintenanceOpen).toBe(3);
	});

	it("falls back to 0 when prop.open_maintenance is undefined (optional field)", () => {
		// `open_maintenance` is optional on PropertyPerformance; omitting it
		// from the literal is sufficient to exercise the `?? 0` read seam.
		const payload: OwnerDashboardData = {
			...basePayload,
			propertyPerformance: [baseProperty],
		};
		const result = transformDashboardData(payload);
		expect(result.portfolioRows[0]?.maintenanceOpen).toBe(0);
	});

	it("preserves the row-order from propertyPerformance", () => {
		const payload: OwnerDashboardData = {
			...basePayload,
			propertyPerformance: [
				{ ...baseProperty, property_id: "p-a", open_maintenance: 0 },
				{ ...baseProperty, property_id: "p-b", open_maintenance: 5 },
				{ ...baseProperty, property_id: "p-c", open_maintenance: 1 },
			],
		};
		const result = transformDashboardData(payload);
		expect(result.portfolioRows.map((r) => r.id)).toEqual([
			"p-a",
			"p-b",
			"p-c",
		]);
		expect(result.portfolioRows.map((r) => r.maintenanceOpen)).toEqual([
			0, 5, 1,
		]);
	});
});
