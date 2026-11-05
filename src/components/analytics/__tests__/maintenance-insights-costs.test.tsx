/**
 * @vitest-environment jsdom
 * The maintenance insights' cost and trend cards read the spend and the
 * request trends get_maintenance_analytics computes (20261102184503).
 *
 * Both cards were hard-coded empty (the mapper returned [] for each, because
 * the RPC returned its costs and trends as literals). They now show the
 * figures, say "No data" when the owner has none, and say "Unavailable",
 * never an empty chart or $0, while the server's body still returns the
 * literals.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	MaintenanceCostChart,
	MaintenanceTrendChart,
} from "#components/analytics/maintenance-charts";
import { costSummaryLine } from "#components/analytics/maintenance-insights-section";

const COSTS = {
	totalCost: 790.5,
	costedRequests: 4,
	averageCost: 197.63,
	monthlyCost: [],
	vendors: [],
};

describe("the cost card's line", () => {
	it("states the spend to date and the average's denominator", () => {
		expect(costSummaryLine(COSTS)).toBe(
			"$790.50 to date · $197.63 average across 4 requests with costs",
		);
		expect(
			costSummaryLine({
				...COSTS,
				totalCost: 120,
				costedRequests: 1,
				averageCost: 120,
			}),
		).toBe("$120.00 to date · $120.00 average across 1 request with costs");
	});

	it("says when no request has a cost, with no $0 average", () => {
		expect(
			costSummaryLine({
				...COSTS,
				totalCost: 0,
				costedRequests: 0,
				averageCost: null,
			}),
		).toBe("No expenses recorded on your requests yet");
	});

	it("names no figure while the costs are unavailable", () => {
		expect(costSummaryLine(null)).toBe("Spend on your requests, to date");
		expect(costSummaryLine(null)).not.toMatch(/\$/);
	});
});

describe("the cost chart", () => {
	it("says the costs are unavailable, not that there are none", () => {
		render(<MaintenanceCostChart entries={[]} available={false} />);
		expect(screen.getByText("Unavailable")).toBeInTheDocument();
		expect(
			screen.getByText("Maintenance costs aren't available yet."),
		).toBeInTheDocument();
	});

	it("says no expenses are recorded when there are none", () => {
		render(<MaintenanceCostChart entries={[]} available={true} />);
		expect(screen.getByText("No data")).toBeInTheDocument();
		expect(
			screen.getByText("No maintenance expenses recorded yet."),
		).toBeInTheDocument();
	});
});

describe("the trend chart", () => {
	it("says the trends are unavailable when the server reports none", () => {
		render(<MaintenanceTrendChart points={null} />);
		expect(screen.getByText("Unavailable")).toBeInTheDocument();
		expect(
			screen.getByText("Request trends aren't available yet."),
		).toBeInTheDocument();
	});

	it("says there were no requests when every month is empty", () => {
		render(
			<MaintenanceTrendChart
				points={["2026-09", "2026-10"].map((period) => ({
					period,
					completed: 0,
					pending: 0,
				}))}
			/>,
		);
		expect(
			screen.getByText("No maintenance requests in the last 12 months."),
		).toBeInTheDocument();
	});
});
