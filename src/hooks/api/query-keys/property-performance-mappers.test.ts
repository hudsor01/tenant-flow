/**
 * get_property_performance_analytics at the boundary, and the two page
 * queries that read it through `mapPropertyPerformance`.
 *
 * Production's body before 20261102163709 returns `0::numeric AS
 * total_revenue` and echoes p_timeframe; the pages showed that 0 as every
 * property's "Monthly revenue" and "Revenue". These pin that rent received is
 * read from the new body only, over the window asked for, and is null (shown
 * as unavailable) otherwise.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc, unitsRead } = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	unitsRead: {
		rows: [] as Record<string, unknown>[],
		calls: [] as Array<[string, ...unknown[]]>,
	},
}));

/**
 * `supabase.from("units")` as fetchCountedUnits reads it: every filter and
 * order is recorded, and the range resolves the rows (one short page).
 */
function unitsFrom(table: string) {
	if (table !== "units") throw new Error(`the page reads no table ${table}`);
	const chain = {
		select: (...args: unknown[]) => {
			unitsRead.calls.push(["select", ...args]);
			return chain;
		},
		eq: (...args: unknown[]) => {
			unitsRead.calls.push(["eq", ...args]);
			return chain;
		},
		neq: (...args: unknown[]) => {
			unitsRead.calls.push(["neq", ...args]);
			return chain;
		},
		order: (...args: unknown[]) => {
			unitsRead.calls.push(["order", ...args]);
			return chain;
		},
		range: (...args: unknown[]) => {
			unitsRead.calls.push(["range", ...args]);
			return Promise.resolve({ data: [...unitsRead.rows], error: null });
		},
	};
	return chain;
}

vi.mock("#lib/supabase/client", async () => {
	const { pagedRpc } = await import("#test/mocks/paged-rpc");
	return {
		createClient: () => ({ rpc: pagedRpc(mockRpc), from: unitsFrom }),
	};
});
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));

import { parseStatedWindow } from "#lib/stated-window";
import { analyticsQueries } from "../use-analytics";
import { propertyQueries } from "./property-keys";
import {
	mapPropertyPerformance,
	propertyPerformanceRange,
	taxYearRange,
} from "./property-performance-mappers";

const WINDOW = "2026-10-03/2026-11-02";

function row(overrides: Record<string, unknown> = {}) {
	return {
		property_id: "p1",
		property_name: "Alpha Court",
		occupancy_rate: 50,
		total_revenue: 2750.5,
		total_expenses: 200.25,
		net_income: 2550.25,
		timeframe: WINDOW,
		...overrides,
	};
}

describe("p_timeframe", () => {
	it("asks for a range with '..', which no answer is ever written in", () => {
		expect(propertyPerformanceRange("2025-02-01", "2025-03-31")).toBe(
			"2025-02-01..2025-03-31",
		);
		expect(taxYearRange(2025)).toBe("2025-01-01..2025-12-31");
	});

	it("reads only a stated 'YYYY-MM-DD/YYYY-MM-DD' window", () => {
		expect(parseStatedWindow("2025-01-01/2025-12-31")).toEqual({
			start_date: "2025-01-01",
			end_date: "2025-12-31",
		});
		for (const value of [
			"30d",
			"2025-01-01..2025-12-31",
			"",
			null,
			7,
			"2025",
		]) {
			expect(parseStatedWindow(value), String(value)).toBeNull();
		}
	});
});

describe("mapPropertyPerformance", () => {
	it("passes each property's rent received, expenses and net income through", () => {
		expect(mapPropertyPerformance([row()])).toEqual({
			status: "ready",
			window: { start_date: "2026-10-03", end_date: "2026-11-02" },
			properties: [
				{
					propertyId: "p1",
					propertyName: "Alpha Court",
					deleted: false,
					occupancyRate: 50,
					rentReceived: 2750.5,
					expenses: 200.25,
					netIncome: 2550.25,
				},
			],
		});
	});

	it("says rent received is unavailable when the body echoes its request", () => {
		expect(
			mapPropertyPerformance([row({ timeframe: "30d", total_revenue: 0 })]),
		).toEqual({
			status: "rent-received-unavailable",
			occupancy: [
				{ propertyId: "p1", propertyName: "Alpha Court", occupancyRate: 50 },
			],
		});
	});

	it("says so when the window is not the one asked for", () => {
		const result = mapPropertyPerformance([row()], {
			start_date: "2025-01-01",
			end_date: "2025-12-31",
		});
		expect(result.status).toBe("rent-received-unavailable");
	});

	it("says so when the rows state different windows", () => {
		const result = mapPropertyPerformance([
			row(),
			row({ property_id: "p2", timeframe: "2026-10-04/2026-11-03" }),
		]);
		expect(result.status).toBe("rent-received-unavailable");
	});

	it("has nothing to say about an empty portfolio", () => {
		expect(mapPropertyPerformance(null)).toEqual({
			status: "ready",
			window: null,
			properties: [],
		});
		expect(
			mapPropertyPerformance([], {
				start_date: "2025-01-01",
				end_date: "2025-12-31",
			}),
		).toEqual({
			status: "ready",
			window: { start_date: "2025-01-01", end_date: "2025-12-31" },
			properties: [],
		});
	});
});

function unit(overrides: Record<string, unknown> = {}) {
	return {
		id: "u1",
		property_id: "p1",
		unit_number: "1A",
		status: "occupied",
		bedrooms: 2,
		bathrooms: 1,
		rent_amount: 1200,
		square_feet: 850,
		properties: { status: "active" },
		...overrides,
	};
}

describe("the property performance page's query", () => {
	beforeEach(() => {
		mockRpc.mockReset();
		unitsRead.rows = [];
		unitsRead.calls = [];
	});

	// The page read "0 of 0 occupied", a Units column of "0/0", no unit
	// statistics and no active unit for every owner: the RPC carries no unit,
	// and the query wrote 0 and [] (part Q).
	it("fills the units, each property's and the portfolio's, from the counted units", async () => {
		mockRpc.mockResolvedValue({
			data: [row(), row({ property_id: "p2", property_name: "Beta House" })],
			error: null,
		});
		unitsRead.rows = [
			unit(),
			unit({ id: "u2", unit_number: "1B", status: "available" }),
			unit({ id: "u3", unit_number: null, status: "maintenance" }),
			unit({
				id: "u4",
				property_id: "p2",
				unit_number: "7",
				status: "occupied",
			}),
			unit({
				id: "u5",
				property_id: "p2",
				unit_number: "8",
				status: "reserved",
			}),
		];
		const data = await new QueryClient().query(
			analyticsQueries.propertyPerformancePageData(),
		);
		expect(unitsRead.calls).toEqual([
			[
				"select",
				"property_id, unit_number, status, bedrooms, bathrooms, rent_amount, properties!inner(status)",
			],
			["eq", "owner_user_id", "owner-1"],
			["neq", "status", "inactive"],
			["neq", "properties.status", "inactive"],
			["order", "updated_at", { ascending: false }],
			["order", "id"],
			["range", 0, 999],
		]);
		expect(data.metrics.totalUnits).toBe(5);
		expect(data.metrics.occupiedUnits).toBe(2);
		expect(
			data.performance.map((p) => [p.totalUnits, p.occupiedUnits]),
		).toEqual([
			[3, 1],
			[2, 1],
		]);
		expect(data.units.map((u) => [u.unit_number, u.rent])).toEqual([
			["1A", 1200],
			["1B", 1200],
			[null, 1200],
			["7", 1200],
			["8", 1200],
		]);
		// What the page reads, and nothing else.
		expect(Object.keys(data.performance[0] ?? {}).sort()).toEqual([
			"occupancyRate",
			"occupiedUnits",
			"propertyName",
			"property_id",
			"rentReceived",
			"totalUnits",
		]);
		expect(Object.keys(data.units[0] ?? {}).sort()).toEqual([
			"bathrooms",
			"bedrooms",
			"property_id",
			"rent",
			"status",
			"unit_number",
		]);
		expect(data.unitStats).toEqual([
			{ label: "Units", value: 5 },
			{ label: "Occupied", value: 2 },
			{ label: "Available", value: 1 },
			{ label: "Reserved", value: 1 },
			{ label: "Maintenance", value: 1 },
		]);
		expect(Object.keys(data).sort()).toEqual([
			"metrics",
			"performance",
			"unitStats",
			"units",
		]);
	});

	it("asks for the trailing 30 days and totals the rent received", async () => {
		mockRpc.mockResolvedValue({
			data: [
				row(),
				row({
					property_id: "p2",
					property_name: "Beta House",
					occupancy_rate: 100,
					total_revenue: -79.75,
				}),
			],
			error: null,
		});
		const data = await new QueryClient().query(
			analyticsQueries.propertyPerformancePageData(),
		);
		expect(mockRpc).toHaveBeenCalledWith("get_property_performance_analytics", {
			p_user_id: "owner-1",
			p_timeframe: "30d",
		});
		expect(data.metrics.rentReceived).toBe(2670.75);
		expect(data.metrics.rentReceivedWindow).toEqual({
			start_date: "2026-10-03",
			end_date: "2026-11-02",
		});
		expect(data.metrics.averageOccupancy).toBe(75);
		expect(data.performance.map((p) => p.rentReceived)).toEqual([
			2750.5, -79.75,
		]);
	});

	it("reports no rent received, never $0, from the body before 20261102163709", async () => {
		mockRpc.mockResolvedValue({
			data: [row({ timeframe: "30d", total_revenue: 0, net_income: -200.25 })],
			error: null,
		});
		const data = await new QueryClient().query(
			analyticsQueries.propertyPerformancePageData(),
		);
		expect(data.metrics.rentReceived).toBeNull();
		expect(data.metrics.rentReceivedWindow).toBeNull();
		expect(data.performance[0]?.rentReceived).toBeNull();
		expect(data.performance[0]?.occupancyRate).toBe(50);
	});
});

describe("the property page's performance query", () => {
	beforeEach(() => mockRpc.mockReset());

	it("asks for the trailing 365 days of one property", async () => {
		mockRpc.mockResolvedValue({ data: [row()], error: null });
		const result = await new QueryClient().query(
			propertyQueries.performance("p1"),
		);
		expect(mockRpc).toHaveBeenCalledWith("get_property_performance_analytics", {
			p_user_id: "owner-1",
			p_property_id: "p1",
			p_timeframe: "365d",
		});
		expect(result).toMatchObject({
			status: "ready",
			properties: [{ rentReceived: 2750.5, netIncome: 2550.25 }],
		});
	});

	it("keeps occupancy and drops the dollars from the old body", async () => {
		mockRpc.mockResolvedValue({
			data: [row({ timeframe: "365d", total_revenue: 0 })],
			error: null,
		});
		const result = await new QueryClient().query(
			propertyQueries.performance("p1"),
		);
		expect(result).toEqual({
			status: "rent-received-unavailable",
			occupancy: [
				{ propertyId: "p1", propertyName: "Alpha Court", occupancyRate: 50 },
			],
		});
	});

	it("is null for a property the function returns no row for", async () => {
		mockRpc.mockResolvedValue({ data: [], error: null });
		const result = await new QueryClient().query(
			propertyQueries.performance("p1"),
		);
		expect(result).toBeNull();
	});
});
