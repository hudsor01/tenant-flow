/**
 * A chart of scheduled rent says so (66.2-39 fix round 1, part P), as the
 * financial analytics page's month charts do since part N.
 *
 * get_revenue_trends_optimized's revenue is each month's lease rent, so the
 * shared chart (analytics overview, units page) titled it "Revenue vs
 * Expenses" with "Total Revenue", "Net Profit" and "Profit Margin" beside it;
 * the analytics overview wrapped it in a second card titled "Revenue &
 * Expenses Trend" and "6-month performance overview" over a range that
 * toggles 3, 6 or 12 months.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartAreaInteractive } from "#components/dashboard/chart-area-interactive";
import { resetRechartsProbe, setRechartsProbe } from "#test/mocks/recharts";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import { render } from "#test/utils/test-render";

vi.mock("#hooks/api/use-owner-dashboard-financial", () => ({
	useFinancialChartData: () => ({
		data: [
			{
				date: "2026-10",
				revenue: 2000,
				collected: 1500,
				expenses: 500,
				profit: 1500,
			},
		],
		isLoading: false,
		error: null,
	}),
}));

describe("the scheduled rent and expenses chart", () => {
	afterEach(() => {
		resetRechartsProbe();
	});

	it("names its series and totals scheduled", () => {
		render(<ChartAreaInteractive />);
		expect(screen.getByText("Scheduled Rent & Expenses")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Each month's scheduled rent (not received) and expenses",
			),
		).toBeInTheDocument();
		for (const label of [
			"Scheduled Rent",
			"Scheduled Net",
			"Scheduled Margin",
		]) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
		expect(document.body.textContent).not.toMatch(
			/Revenue|Net Profit|Profit Margin/,
		);
	});

	// The tooltip's formatter returned recharts' [value, name] pair, which
	// ChartTooltipContent renders in place of the whole row: "$2,900Expenses",
	// no key and no space (cycle 2, F33's sweep). Each row is its key, its
	// label and its value, apart.
	it("names each tooltip row's series apart from its dollars", async () => {
		setRechartsProbe({
			tooltip: {
				active: true,
				label: "2026-10",
				payload: [
					{
						dataKey: "expenses",
						name: "expenses",
						value: 500,
						color: "var(--color-chart-4)",
						payload: { date: "2026-10", revenue: 2000, expenses: 500 },
					},
					{
						dataKey: "revenue",
						name: "revenue",
						value: 2000,
						color: "var(--color-chart-1)",
						payload: { date: "2026-10", revenue: 2000, expenses: 500 },
					},
				],
			},
		});
		render(<ChartAreaInteractive />);
		const tooltip = await screen.findByTestId("tooltip");
		for (const [label, value] of [
			["Expenses", "$500"],
			["Scheduled Rent", "$2,000"],
		] as const) {
			const name = within(tooltip).getByText(label);
			expect(name.nextElementSibling?.textContent).toBe(value);
		}
	});

	// Its two areas differed by hue alone, with no legend (the F39 class): the
	// expenses area is dashed and the legend keys draw each series' line.
	it("names both series in a legend and dashes the expenses area", async () => {
		setRechartsProbe({
			legend: [
				{ value: "expenses", dataKey: "expenses", type: "line" },
				{ value: "revenue", dataKey: "revenue", type: "line" },
			],
		});
		render(<ChartAreaInteractive />);
		const areas = await screen.findAllByTestId("area");
		expect(
			areas.map((area) => [
				area.getAttribute("data-key"),
				area.getAttribute("data-stroke-dasharray"),
			]),
		).toEqual([
			["expenses", "5 3"],
			["revenue", null],
		]);
		const legend = screen.getByTestId("legend");
		expect(legend.textContent).toBe("ExpensesScheduled Rent");
		expect(
			[...legend.querySelectorAll("svg line")].map((key) =>
				key.getAttribute("stroke-dasharray"),
			),
		).toEqual(["5 3", null]);
	});

	// The v4 Card spaces its children with gap-6; the chart's CardContent
	// added the v3 pt-4 / sm:pt-6 on top, 40 / 48px under the totals (the G4
	// sweep).
	it("adds no top padding of its own under the totals", async () => {
		render(<ChartAreaInteractive />);
		const content = document.querySelector("[data-slot=card-content]");
		if (!content) throw new Error("the chart rendered no card content");
		const designSystem = await loadProjectDesignSystem();
		const css = designSystem
			.candidatesToCss([...content.classList])
			.filter((rule): rule is string => rule !== null)
			.join("\n");
		expect(css).toContain("padding-inline");
		expect(css).not.toMatch(/padding(-top|-block)?\s*:/);
	});

	it("sits on the analytics overview under its own title only", () => {
		// Its code, comments (which record what the wrapper said) removed.
		const source = readFileSync(
			join(process.cwd(), "src/app/(owner)/analytics/overview/page.tsx"),
			"utf8",
		)
			.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
			.replace(/\/\/.*$/gm, "");
		expect(source).toContain("<ChartAreaInteractive />");
		expect(source).not.toMatch(/Revenue & Expenses Trend|6-month performance/);
	});
});
