/**
 * Sections that could only ever be empty, filled from a source that exists or
 * removed (66.2-39 fix round 1, part Q).
 *
 *  - /analytics/property-performance read "0 of 0 occupied", a Units column of
 *    "0/0", no Portfolio KPIs, no active unit and an empty Visitor analytics
 *    chart for every owner: the query wrote 0 and []. The units now come from
 *    the owner's counted units (fetchCountedUnits); no visitor, inquiry or
 *    listing view is tracked anywhere, so that chart is gone.
 *  - the leases page's insights drew a "Lease lifecycle" and a "Status
 *    breakdown" chart from `lifecycle: []` and `statusBreakdown: []`: no source
 *    records renewals or notices over time, and the page's tiles already count
 *    each status. Both charts are gone.
 *  - the properties page's insights listed "Vacancy hotspots" from
 *    `vacancyAnalysis: []`: no unit status history exists, so no vacancy day is
 *    known. The list is gone.
 */
import {
	QueryClient,
	QueryClientProvider,
	queryOptions,
} from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactElement, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import type {
	OccupancyAnalyticsPageData,
	PropertyPerformancePageData,
} from "#types/analytics-page-data";

const { pageData } = vi.hoisted(() => ({
	pageData: {
		metrics: {
			totalProperties: 2,
			totalUnits: 5,
			occupiedUnits: 2,
			averageOccupancy: 40,
			rentReceived: 1200,
			rentReceivedWindow: { start_date: "2026-10-03", end_date: "2026-11-02" },
		},
		performance: [
			{
				property_id: "p1",
				propertyName: "Alpha Court",
				occupancyRate: 33.33,
				rentReceived: 1200,
				totalUnits: 3,
				occupiedUnits: 1,
			},
		],
		units: [
			{
				property_id: "p1",
				unit_number: "1A",
				status: "occupied",
				bedrooms: 2,
				bathrooms: 1,
				rent: 1200,
			},
		],
		unitStats: [
			{ label: "Units", value: 5 },
			{ label: "Occupied", value: 2 },
		],
	} satisfies PropertyPerformancePageData,
}));

vi.mock("#hooks/api/use-analytics", () => ({
	analyticsQueries: {
		propertyPerformancePageData: () =>
			queryOptions({
				queryKey: ["test", "property-performance"],
				queryFn: async () => pageData,
			}),
		leaseProfitability: () =>
			queryOptions({
				queryKey: ["test", "lease-profitability"],
				queryFn: async () => ({ status: "unavailable" as const }),
			}),
		occupancyPageData: () =>
			queryOptions({
				queryKey: ["test", "occupancy"],
				queryFn: async (): Promise<OccupancyAnalyticsPageData> => ({
					trends: [],
				}),
			}),
	},
}));
vi.mock("#components/ui/number-ticker", () => ({
	NumberTicker: ({ value }: { value: number }) =>
		createElement("span", null, String(value)),
}));

import { LeaseInsightsSection } from "#components/analytics/lease-insights-section";
import { PropertyInsightsSection } from "#components/analytics/property-insights-section";
import PropertyPerformancePage from "../property-performance/page";

function withClient(element: ReactElement) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<Suspense fallback={null}>{element}</Suspense>
		</QueryClientProvider>,
	);
}

describe("the property performance page", () => {
	it("shows the counted units and no visitor analytics", async () => {
		withClient(<PropertyPerformancePage />);
		expect(await screen.findByText("Top properties")).toBeInTheDocument();
		expect(screen.getByText(/2\s+of\s+5\s+occupied/)).toBeInTheDocument();
		expect(screen.getByText("Portfolio KPIs")).toBeInTheDocument();
		expect(screen.queryByText("Visitor analytics")).toBeNull();
		expect(document.body).not.toHaveTextContent(/visit|inquir|demand signal/i);
	});
});

describe("the leases page's insights", () => {
	it("draw no lifecycle or status chart", async () => {
		withClient(<LeaseInsightsSection />);
		expect(await screen.findByText("Lease profitability")).toBeInTheDocument();
		expect(screen.queryByText("Lease lifecycle")).toBeNull();
		expect(screen.queryByText("Status breakdown")).toBeNull();
	});
});

describe("the properties page's insights", () => {
	it("list no vacancy hotspots", async () => {
		withClient(<PropertyInsightsSection />);
		expect(await screen.findByText("Occupancy trends")).toBeInTheDocument();
		expect(screen.queryByText("Vacancy hotspots")).toBeNull();
	});
});
