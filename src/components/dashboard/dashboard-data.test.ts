import { describe, expect, it } from "vitest";
import type { OwnerDashboardData } from "#hooks/api/use-owner-dashboard";
import { transformDashboardData } from "./dashboard-data";

/**
 * Pins the canonical `transformDashboardData` contract — specifically the
 * Phase 2 (POLISH-10) addition of `open_maintenance` flowing into
 * `portfolioRows[i].maintenanceOpen`.
 *
 * The live `/dashboard` page does NOT consume `transformDashboardData` today
 * — it uses an inline transform in `dashboard.tsx:86-102` plus a re-mapper
 * in `page.tsx:97-110`. The canonical transform survives as a Phase-3 seam
 * (per Phase 1 CONTEXT D-10). Without this test, a regression in
 * `transformDashboardData.maintenanceOpen` would not surface until Phase 3
 * wires `dashboard-view.tsx`.
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
		const { open_maintenance: _unused, ...propertyWithoutMaintenance } = {
			...baseProperty,
			open_maintenance: undefined as number | undefined,
		};
		const payload: OwnerDashboardData = {
			...basePayload,
			propertyPerformance: [propertyWithoutMaintenance],
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
