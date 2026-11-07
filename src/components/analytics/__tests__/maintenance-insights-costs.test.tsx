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
import { afterEach, describe, expect, it } from "vitest";
import {
	MaintenanceCostChart,
	MaintenanceTrendChart,
} from "#components/analytics/maintenance-charts";
import { costSummaryLine } from "#components/analytics/maintenance-insights-section";
import { resetRechartsProbe, setRechartsProbe } from "#test/mocks/recharts";

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
	afterEach(() => {
		resetRechartsProbe();
	});

	// A vendor's spend is dollars (cycle 2, F33): the axis read "0 / 200 /
	// 400" and the tooltip "Cost 790.5", with no $ and no cents.
	it("states its axis and tooltip in dollars", async () => {
		setRechartsProbe({
			yTicks: [0, 400],
			tooltip: {
				active: true,
				label: "Acme Plumbing",
				payload: [
					{
						dataKey: "amount",
						name: "amount",
						value: 790.5,
						color: "var(--color-amount)",
						payload: { category: "Acme Plumbing", amount: 790.5 },
					},
				],
			},
		});
		render(
			<MaintenanceCostChart
				entries={[{ category: "Acme Plumbing", amount: 790.5 }]}
				available={true}
			/>,
		);
		const ticks = await screen.findAllByTestId("y-tick");
		expect(ticks.map((tick) => tick.textContent)).toEqual(["$0", "$400"]);
		const tooltip = screen.getByTestId("tooltip");
		expect(tooltip).toHaveTextContent(/^Acme PlumbingCost\$790\.50$/);
		expect(tooltip.textContent).not.toContain("790.5C");
	});

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
	afterEach(() => {
		resetRechartsProbe();
	});

	// Completed (success-text) and open (warning-text) are close in lightness,
	// so only hue told them apart, with no legend (cycle 2, F39). The open line
	// is dashed and the legend names each series beside a key drawn like it.
	it("names both series in a legend and dashes the open one", async () => {
		setRechartsProbe({
			legend: [
				{ value: "completed", dataKey: "completed", type: "line" },
				{ value: "pending", dataKey: "pending", type: "line" },
			],
		});
		render(
			<MaintenanceTrendChart
				points={[
					{ period: "2026-09", completed: 2, pending: 1 },
					{ period: "2026-10", completed: 1, pending: 3 },
				]}
			/>,
		);
		const lines = await screen.findAllByTestId("line");
		expect(
			lines.map((line) => [
				line.getAttribute("data-key"),
				line.getAttribute("data-stroke-dasharray"),
			]),
		).toEqual([
			["completed", null],
			["pending", "5 3"],
		]);
		const legend = screen.getByTestId("legend");
		const keys = [...legend.querySelectorAll("svg line")];
		expect(legend.textContent).toBe("CompletedPending");
		expect(keys.map((key) => key.getAttribute("stroke-dasharray"))).toEqual([
			null,
			"5 3",
		]);
		expect(keys.map((key) => key.getAttribute("stroke"))).toEqual([
			"var(--color-completed)",
			"var(--color-pending)",
		]);
	});

	it("says the trends are unavailable when the server reports none", () => {
		render(<MaintenanceTrendChart points={null} />);
		expect(screen.getByText("Unavailable")).toBeInTheDocument();
		expect(
			screen.getByText("Request trends aren't available yet."),
		).toBeInTheDocument();
	});

	// Both series leave out cancelled requests (cycle 2, F34): an owner whose
	// only request was cancelled was told there were none.
	it("says none were completed or open when every month is empty", () => {
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
			screen.getByText("No requests completed or open in the last 12 months."),
		).toBeInTheDocument();
	});
});
