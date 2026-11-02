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
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChartAreaInteractive } from "#components/dashboard/chart-area-interactive";
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
