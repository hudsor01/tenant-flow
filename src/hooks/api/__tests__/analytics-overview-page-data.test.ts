/**
 * The analytics overview's page data holds what the page renders (66.2-39
 * fix round 1, part R).
 *
 * analyticsQueries.overviewPageData fetched get_financial_overview,
 * get_maintenance_analytics and the occupancy series, and returned a
 * financial, a maintenance and a lease slice; the overview page reads
 * `financial.metrics` alone. The lease slice was occupancyAsLeaseAnalytics:
 * its metrics written 0 and its renewal rates, distribution, lifecycle and
 * status breakdown written [], read nowhere. The query now makes the one call
 * the page needs and returns the slice it reads.
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

import { analyticsQueries } from "../use-analytics";

describe("analyticsQueries.overviewPageData", () => {
	it("reads get_financial_overview alone and returns the slice the page renders", async () => {
		mockRpc.mockImplementation((name: string) =>
			Promise.resolve(
				name === "get_financial_overview"
					? {
							data: {
								overview: {
									total_revenue: 120000,
									total_expenses: 30000,
									net_income: 90000,
								},
							},
							error: null,
						}
					: { data: null, error: null },
			),
		);
		const data = await new QueryClient().query(
			analyticsQueries.overviewPageData(),
		);
		expect(mockRpc.mock.calls.map(([name]) => name)).toEqual([
			"get_financial_overview",
		]);
		expect(mockRpc).toHaveBeenCalledWith("get_financial_overview", {
			p_user_id: "owner-1",
		});
		expect(Object.keys(data)).toEqual(["financial"]);
		expect(data.financial.metrics.totalRevenue).toBe(120000);
		expect(data.financial.metrics.netIncome).toBe(90000);
	});
});
