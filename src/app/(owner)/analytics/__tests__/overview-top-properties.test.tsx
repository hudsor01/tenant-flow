/**
 * `/analytics/overview` "Top Performing Properties" lists the owner's
 * properties.
 *
 * The card was fed `const properties = [] as PropertyPerformance[]`, so it
 * always showed "No property data available yet." The data was already on the
 * page's own query: `get_dashboard_data_v2`'s `property_performance` (the
 * dashboard's portfolio rows, with units and monthly revenue), which
 * `usePropertyPerformance()` selects from the cache `useDashboardStats()`
 * fills, so the card costs no extra request. The card ranks by monthly
 * revenue, as its subtitle says, and shows the figure it ranks by.
 */

import {
	QueryClient,
	QueryClientProvider,
	queryOptions,
} from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#components/ui/tooltip";
import { formatCurrency } from "#lib/utils/currency";
import type { PropertyPerformance } from "#types/core";

const { propertyPerformance } = vi.hoisted(() => ({
	propertyPerformance: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
	default: () => () => createElement("div", { "data-testid": "chart" }),
}));
vi.mock("#hooks/api/use-analytics", () => ({
	analyticsQueries: {
		ownerPaymentSummary: () =>
			queryOptions({
				queryKey: ["test", "payment-summary"],
				queryFn: async () => ({
					lateFeeTotal: 0,
					unpaidTotal: 0,
					unpaidCount: 0,
					tenantCount: 0,
				}),
			}),
		overviewPageData: () =>
			queryOptions({
				queryKey: ["test", "overview"],
				queryFn: async () => ({}),
			}),
	},
}));
vi.mock("#hooks/api/use-dashboard-hooks", () => ({
	useDashboardStats: () => ({ data: undefined }),
	usePropertyPerformance: propertyPerformance,
}));

function property(
	name: string,
	monthlyRevenue: number,
	occupied: number,
	total: number,
): PropertyPerformance {
	return {
		property: name,
		property_id: `id-${name}`,
		totalUnits: total,
		occupiedUnits: occupied,
		vacantUnits: total - occupied,
		occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
		revenue: monthlyRevenue * 12,
		monthlyRevenue,
		potentialRevenue: monthlyRevenue,
		address_line1: "1 Main St",
		property_type: "apartment",
		status: occupied === total ? "FULL" : "PARTIAL",
		trend: "stable",
		trendPercentage: 0,
	};
}

const PORTFOLIO = [
	property("Elm Court", 1800, 2, 2),
	property("Maple Flats", 4200, 3, 4),
	property("Birch House", 950, 1, 1),
	property("Oak Row", 4200, 4, 4),
	property("Pine Lofts", 3100, 5, 6),
	property("Cedar Duplex", 2400, 1, 2),
];

async function renderCard() {
	const { default: Page } = await import("../overview/page");
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	render(
		createElement(
			QueryClientProvider,
			{ client },
			createElement(TooltipProvider, null, createElement(Page)),
		),
	);
	const heading = await screen.findByText("Top Performing Properties");
	const card = heading.closest(".bg-card");
	if (!(card instanceof HTMLElement)) throw new Error("no card");
	return card;
}

beforeEach(() => {
	propertyPerformance.mockReset();
});

describe("Top Performing Properties", () => {
	it("lists the five highest monthly revenues, ties by name", async () => {
		propertyPerformance.mockReturnValue({
			data: PORTFOLIO,
			isLoading: false,
			isError: false,
		});
		const card = await renderCard();
		const names = within(card)
			.getAllByText(/Court|Flats|House|Row|Lofts|Duplex/)
			.map((node) => node.textContent);
		expect(names).toEqual([
			"Maple Flats",
			"Oak Row",
			"Pine Lofts",
			"Cedar Duplex",
			"Elm Court",
		]);
		expect(within(card).queryByText("Birch House")).toBeNull();
		expect(within(card).queryByText(/No property data/)).toBeNull();
	});

	it("shows each property's revenue, units and occupancy", async () => {
		propertyPerformance.mockReturnValue({
			data: [property("Maple Flats", 4200, 3, 4)],
			isLoading: false,
			isError: false,
		});
		const card = await renderCard();
		expect(
			within(card).getByText(`${formatCurrency(4200)}/mo · 3/4 units occupied`),
		).toBeInTheDocument();
		expect(within(card).getByText("75.0%")).toBeInTheDocument();
	});

	it("says a property has no units instead of a 0.0% occupancy badge", async () => {
		propertyPerformance.mockReturnValue({
			data: [property("Empty Lot", 0, 0, 0)],
			isLoading: false,
			isError: false,
		});
		const card = await renderCard();
		expect(
			within(card).getByText(`${formatCurrency(0)}/mo · No units`),
		).toBeInTheDocument();
		expect(within(card).queryByText("0.0%")).toBeNull();
	});

	it("sets the row's lines without the base paragraph margin", async () => {
		propertyPerformance.mockReturnValue({
			data: [property("Maple Flats", 4200, 3, 4)],
			isLoading: false,
			isError: false,
		});
		const card = await renderCard();
		for (const text of [
			"Maple Flats",
			`${formatCurrency(4200)}/mo · 3/4 units occupied`,
		]) {
			expect(within(card).getByText(text).className).toMatch(/\bmb-0\b/);
		}
	});

	it("says so when the owner has no properties", async () => {
		propertyPerformance.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
		});
		const card = await renderCard();
		expect(
			within(card).getByText("No property data available yet."),
		).toBeInTheDocument();
	});

	it("shows skeleton rows while loading", async () => {
		propertyPerformance.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		const loading = await renderCard();
		expect(loading.querySelectorAll("[data-slot=skeleton]")).toHaveLength(5);
		expect(within(loading).queryByText(/No property data/)).toBeNull();
	});

	it("does not claim there is no data when the read fails", async () => {
		propertyPerformance.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		const card = await renderCard();
		expect(
			within(card).getByText("Property data could not be loaded."),
		).toBeInTheDocument();
		expect(within(card).queryByText(/No property data/)).toBeNull();
	});
});
