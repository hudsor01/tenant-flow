/**
 * /analytics/property-performance and the property page show each property's
 * rent received, from the rent ledger, over the window the server states.
 *
 * Production's body before 20261102163709 returns 0 as every property's
 * revenue, and these surfaces showed it as "Monthly revenue" (the tile and the
 * Top properties column) and "Revenue" (the property page). They now label the
 * figure "Rent received", say which days it covers, and say it is unavailable,
 * with no $0, when the server cannot report it yet.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type {
	PropertyPerformanceEntry,
	PropertyPerformanceSummary,
} from "#types/analytics";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ rpc: mockRpc }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));
vi.mock("#components/ui/number-ticker", () => ({
	NumberTicker: ({ value }: { value: number }) =>
		createElement("span", null, `$${value.toFixed(2)}`),
}));

import { PropertyPerformanceSection } from "#components/properties/property-performance-section";
import { PerformanceStatCards } from "../performance-stat-cards";
import { TopPropertiesTable } from "../top-properties-table";

function summary(
	overrides: Partial<PropertyPerformanceSummary>,
): PropertyPerformanceSummary {
	return {
		totalProperties: 2,
		totalUnits: 0,
		occupiedUnits: 0,
		averageOccupancy: 75,
		rentReceived: 2670.75,
		rentReceivedWindow: { start_date: "2026-10-03", end_date: "2026-11-02" },
		...overrides,
	};
}

function entry(
	overrides: Partial<PropertyPerformanceEntry>,
): PropertyPerformanceEntry {
	return {
		property_id: "p1",
		propertyName: "Alpha Court",
		occupancyRate: 50,
		rentReceived: 2750.5,
		totalUnits: 0,
		occupiedUnits: 0,
		...overrides,
	};
}

function withQueryClient(ui: ReactElement) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(createElement(QueryClientProvider, { client }, ui));
}

describe("the Rent received tile", () => {
	it("shows the total and the days it covers", () => {
		render(createElement(PerformanceStatCards, { metrics: summary({}) }));
		expect(screen.getByText("Rent received")).toBeInTheDocument();
		expect(screen.getByText("$2670.75")).toBeInTheDocument();
		expect(screen.getByText("Oct 3 to Nov 2, 2026")).toBeInTheDocument();
		expect(screen.queryByText("Monthly revenue")).not.toBeInTheDocument();
	});

	it("gives the start its year when the window crosses one", () => {
		render(
			createElement(PerformanceStatCards, {
				metrics: summary({
					rentReceivedWindow: {
						start_date: "2025-12-03",
						end_date: "2026-01-02",
					},
				}),
			}),
		);
		expect(screen.getByText("Dec 3, 2025 to Jan 2, 2026")).toBeInTheDocument();
	});

	it("says it is unavailable, with no amount, when the server cannot report it", () => {
		render(
			createElement(PerformanceStatCards, {
				metrics: summary({ rentReceived: null, rentReceivedWindow: null }),
			}),
		);
		expect(screen.getByText("Unavailable")).toBeInTheDocument();
		expect(screen.getByText("Ledger totals pending")).toBeInTheDocument();
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
	});
});

describe("the Top properties table", () => {
	it("has a Rent received column", () => {
		render(createElement(TopPropertiesTable, { properties: [entry({})] }));
		expect(
			screen.getByRole("columnheader", { name: /Rent received/ }),
		).toBeInTheDocument();
		expect(screen.queryByText(/Monthly revenue/)).not.toBeInTheDocument();
	});

	it("leaves the column out rather than filling it with $0", () => {
		render(
			createElement(TopPropertiesTable, {
				properties: [entry({ rentReceived: null })],
			}),
		);
		expect(
			screen.getByRole("columnheader", { name: /Occupancy/ }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("columnheader", { name: /Rent received/ }),
		).not.toBeInTheDocument();
	});
});

describe("the property page's performance card", () => {
	// Only rent received and expenses are filtered by the window;
	// get_property_performance_analytics reads occupancy from each unit's
	// current status (20261102163709), so the window is not put on it (cycle
	// 2, F59).
	it("shows rent received, expenses and net income over the stated window", async () => {
		mockRpc.mockResolvedValue({
			data: [
				{
					property_id: "p1",
					property_name: "Alpha Court",
					occupancy_rate: 50,
					total_revenue: 2750.5,
					total_expenses: 200.25,
					net_income: 2550.25,
					timeframe: "2025-11-02/2026-11-02",
				},
			],
			error: null,
		});
		withQueryClient(
			createElement(PropertyPerformanceSection, { propertyId: "p1" }),
		);
		expect(await screen.findByText("Rent Received")).toBeInTheDocument();
		expect(screen.getByText("$2,750.50")).toBeInTheDocument();
		expect(screen.getByText("$200.25")).toBeInTheDocument();
		expect(screen.getByText("$2,550.25")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Rent received and expenses, Nov 2, 2025 to Nov 2, 2026. Occupancy is current.",
			),
		).toBeInTheDocument();
	});

	it("calls occupancy current while it loads, too", () => {
		mockRpc.mockReturnValue(new Promise(() => undefined));
		withQueryClient(
			createElement(PropertyPerformanceSection, { propertyId: "p1" }),
		);
		expect(
			screen.getByText(
				"Trailing 12-month rent received and expenses; current occupancy",
			),
		).toBeInTheDocument();
	});

	it("says rent received is unavailable from the body before 20261102163709", async () => {
		mockRpc.mockResolvedValue({
			data: [
				{
					property_id: "p1",
					property_name: "Alpha Court",
					occupancy_rate: 50,
					total_revenue: 0,
					total_expenses: 200.25,
					net_income: -200.25,
					timeframe: "365d",
				},
			],
			error: null,
		});
		withQueryClient(
			createElement(PropertyPerformanceSection, { propertyId: "p1" }),
		);
		expect(
			await screen.findByText(
				"Rent received isn't available yet. Occupancy is current.",
			),
		).toBeInTheDocument();
		expect(screen.getAllByText("Unavailable")).toHaveLength(3);
		expect(screen.getByText("Occupancy")).toBeInTheDocument();
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
		expect(screen.queryByText("-$200.25")).not.toBeInTheDocument();
	});
});
