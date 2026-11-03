/**
 * The dashboard's property rows carry what get_dashboard_data_v2 reports
 * (66.2-39 fix round 1, part R).
 *
 * Each row was given `trend: "stable"` and `trendPercentage: 0`: the function
 * reports no property's change over time, and no screen read either field.
 * Both went from PropertyPerformance (#types/core) and the fetcher.
 */
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ rpc: mockRpc }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));

import { DASHBOARD_BASE_QUERY_OPTIONS } from "../use-owner-dashboard";

describe("the dashboard's property rows", () => {
	it("carry the function's figures, and no trend it does not report", async () => {
		mockRpc.mockResolvedValue({
			data: {
				stats: {},
				trends: {},
				time_series: {},
				activities: [],
				property_performance: [
					{
						property_id: "p1",
						property_name: "Maple Court",
						total_units: 3,
						occupied_units: 2,
						vacant_units: 1,
						occupancy_rate: 66.7,
						annual_revenue: 21600,
						monthly_revenue: 1800,
						potential_revenue: 2700,
						address: "1 Main St",
						property_type: "APARTMENT",
						status: "PARTIAL",
						open_maintenance: 1,
					},
				],
			},
			error: null,
		});
		const data = await new QueryClient().query(DASHBOARD_BASE_QUERY_OPTIONS);
		const [row] = data.propertyPerformance;
		expect(row).toEqual({
			property: "Maple Court",
			property_id: "p1",
			totalUnits: 3,
			occupiedUnits: 2,
			vacantUnits: 1,
			occupancyRate: 66.7,
			revenue: 21600,
			monthlyRevenue: 1800,
			potentialRevenue: 2700,
			address_line1: "1 Main St",
			property_type: "APARTMENT",
			status: "PARTIAL",
			open_maintenance: 1,
		});
	});
});
