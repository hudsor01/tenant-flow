/**
 * Grid placement on the analytics pages, and the overview's dead control.
 *
 * `/analytics/property-performance` and `/analytics/financial` lay their first
 * chart row out as `grid lg:grid-cols-3` with the chart card meant to span two
 * tracks. Each card sits inside a BlurFade, and BlurFade renders its own `<div>`:
 * that div is the grid item, so `lg:col-span-2` on the card inside it did
 * nothing. Measured in Chrome at 1280px the chart card was one track (298.66px)
 * wide, the side column took the second track and the third stayed empty. The
 * span now sits on the BlurFade, the grid item (621.33px, two tracks).
 *
 * `/analytics/overview`'s "Top Performing Properties" header carried a ghost
 * "This Month" button with no handler and no period feature behind it.
 */

import {
	QueryClient,
	QueryClientProvider,
	queryOptions,
} from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#components/ui/tooltip";

vi.mock("next/dynamic", () => ({
	default: () => () => createElement("div", { "data-testid": "chart" }),
}));
vi.mock("#components/dashboard/chart-area-interactive", () => ({
	ChartAreaInteractive: () => createElement("div", { "data-testid": "chart" }),
}));

const { PROPERTY_PERFORMANCE } = vi.hoisted(() => ({
	PROPERTY_PERFORMANCE: {
		metrics: {
			totalProperties: 1,
			totalUnits: 2,
			occupiedUnits: 1,
			averageOccupancy: 50,
			rentReceived: 1500,
			rentReceivedWindow: { start_date: "2026-10-03", end_date: "2026-11-02" },
		},
		performance: [],
		units: [],
		unitStats: [],
	},
}));

vi.mock("#hooks/api/use-analytics", () => ({
	analyticsQueries: {
		propertyPerformancePageData: () =>
			queryOptions({
				queryKey: ["test", "property-performance"],
				queryFn: async () => PROPERTY_PERFORMANCE,
			}),
		financialPageData: () =>
			queryOptions({
				queryKey: ["test", "financial"],
				queryFn: async () => ({}),
			}),
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
	usePropertyPerformance: () => ({
		data: [],
		isLoading: false,
		isError: false,
	}),
}));

function renderPage(ui: ReactElement) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	return render(
		createElement(
			QueryClientProvider,
			{ client },
			createElement(TooltipProvider, null, ui),
		),
	);
}

/** The card's grid item: the nearest ancestor whose parent is the 3-track grid. */
function gridItemOf(heading: HTMLElement): { item: Element; card: Element } {
	const card = heading.closest(".bg-card");
	if (!card) throw new Error("heading has no card");
	let item: Element = card;
	while (item.parentElement && !item.parentElement.classList.contains("grid")) {
		item = item.parentElement;
	}
	expect(item.parentElement?.classList.contains("lg:grid-cols-3")).toBe(true);
	return { item, card };
}

describe("analytics chart rows span two of three tracks", () => {
	it.each([
		[
			"property performance",
			"../property-performance/page",
			"Occupancy & rent received by property",
		],
		["financial", "../financial/page", "Scheduled Rent & Expenses"],
	])("%s: the span sits on the grid item", async (_name, modulePath, title) => {
		const { default: Page } = await import(modulePath);
		renderPage(createElement(Page));
		const heading = await screen.findByText(title);
		const { item, card } = gridItemOf(heading);
		expect(item.getAttribute("data-slot")).toBe("blur-fade");
		expect(item.classList.contains("lg:col-span-2")).toBe(true);
		expect(card.className).not.toMatch(/col-span/);
	});
});

describe("the financial page's expense breakdown", () => {
	// get_expense_summary's categories are vendor names over its default
	// period, January 1 through today (66.2-39 part P): the card said "By
	// category" and listed "Expense Categories".
	it("is by vendor, year to date", async () => {
		const { default: Page } = await import("../financial/page");
		renderPage(createElement(Page));
		const heading = await screen.findByText("Expense Breakdown");
		const card = heading.closest(".bg-card");
		expect(card).not.toBeNull();
		expect(card).toHaveTextContent("By vendor, year to date");
		expect(card).toHaveTextContent("Vendors");
		expect(card?.textContent).not.toMatch(/categor/i);
	});

	// get_financial_overview and get_revenue_trends_optimized split no rent by
	// type, so the Revenue Breakdown card beside it was always empty (part P).
	it("stands alone: there is no always-empty Revenue Breakdown card", async () => {
		const { default: Page } = await import("../financial/page");
		renderPage(createElement(Page));
		await screen.findByText("Expense Breakdown");
		expect(screen.queryByText("Revenue Breakdown")).not.toBeInTheDocument();
		expect(screen.queryByText("Revenue Sources")).not.toBeInTheDocument();
	});
});

describe("analytics overview", () => {
	it("has no dead period button in Top Performing Properties", async () => {
		const { default: Page } = await import("../overview/page");
		renderPage(createElement(Page));
		const heading = await screen.findByText("Top Performing Properties");
		const card = heading.closest(".bg-card");
		expect(card).not.toBeNull();
		expect(card?.querySelectorAll("button")).toHaveLength(0);
		expect(screen.queryByRole("button", { name: /this month/i })).toBeNull();
	});
});
