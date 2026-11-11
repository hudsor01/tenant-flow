/**
 * The callers that show a total or a whole list read every property row of
 * get_property_performance_analytics (66.2-39, part M).
 *
 * p_limit NULL meant 100 rows, and PostgREST returns at most max-rows (1000)
 * of a set a request, so an owner's year-end table, property export and
 * analytics page dropped the rest of their properties and their rent
 * received. 20261110123116 lists every property; these callers page through
 * them, ordered by name and id, until a page comes back short.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { state } = vi.hoisted(() => ({
	state: {
		rows: [] as Record<string, unknown>[],
		pages: [] as Array<{ from: number; to: number; order: string[] }>,
		other: {} as Record<string, unknown>,
	},
}));

/**
 * `supabase.rpc` over a server that caps a request at 1000 rows: awaited as
 * is, the property call returns what the body before returned (100 rows);
 * after .order()/.range() it returns that page. Other RPCs answer from
 * `state.other`.
 */
vi.mock("#lib/supabase/client", async () => {
	const { deletedPropertiesFrom } = await import(
		"#test/mocks/deleted-properties"
	);
	return {
		createClient: () => ({
			from: deletedPropertiesFrom(),
			rpc: (name: string) => {
				if (name !== "get_property_performance_analytics") {
					return Promise.resolve({
						data: state.other[name] ?? null,
						error: null,
					});
				}
				const order: string[] = [];
				const first = Promise.resolve({
					data: state.rows.slice(0, 100),
					error: null,
				});
				const query = Object.assign(first, {
					order: (column: string) => {
						order.push(column);
						return query;
					},
					range: (from: number, to: number) => {
						state.pages.push({ from, to, order: [...order] });
						return Promise.resolve({
							data: state.rows.slice(from, Math.min(to + 1, from + 1000)),
							error: null,
						});
					},
				});
				return query;
			},
		}),
	};
});
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));

import { reportAnalyticsQueries } from "../report-analytics-keys";

const WINDOW = "2025-01-01/2025-12-31";

function portfolio(count: number) {
	return Array.from({ length: count }, (_, at) => ({
		property_id: `p${String(at).padStart(4, "0")}`,
		property_name: `Lot ${String(at).padStart(4, "0")}`,
		occupancy_rate: 0,
		total_revenue: 10,
		total_expenses: 0,
		net_income: 10,
		timeframe: WINDOW,
	}));
}

describe("the year-end report's By Property table", () => {
	beforeEach(() => {
		state.rows = portfolio(1005);
		state.pages = [];
		state.other = {
			get_billing_insights: { collectedTotal: 10050 },
			get_expense_summary: { total_amount: 0, categories: [] },
		};
	});

	it("holds every property past one page, ordered so none is read twice", async () => {
		const result = await new QueryClient().query(
			reportAnalyticsQueries.yearEnd(2025),
		);
		if (result.status !== "ready") throw new Error("unavailable");
		expect(result.summary.byProperty).toHaveLength(1005);
		expect(result.summary.byProperty.at(-1)?.propertyName).toBe("Lot 1004");
		expect(state.pages).toEqual([
			{ from: 0, to: 999, order: ["property_name", "property_id"] },
			{ from: 1000, to: 1999, order: ["property_name", "property_id"] },
		]);
	});

	it("reads one page when the owner has fewer properties than a page", async () => {
		state.rows = portfolio(3);
		const result = await new QueryClient().query(
			reportAnalyticsQueries.yearEnd(2025),
		);
		if (result.status !== "ready") throw new Error("unavailable");
		expect(result.summary.byProperty).toHaveLength(3);
		expect(state.pages).toHaveLength(1);
	});
});

describe("the property portfolio export", () => {
	beforeEach(() => {
		state.rows = portfolio(1005);
		state.pages = [];
	});

	it("lists every property past one page", async () => {
		const report = await new QueryClient().query(
			reportAnalyticsQueries.properties("2025-01-01", "2025-12-31"),
		);
		expect(report.byProperty).toHaveLength(1005);
		expect(report.summary.totalProperties).toBe(1005);
	});
});
