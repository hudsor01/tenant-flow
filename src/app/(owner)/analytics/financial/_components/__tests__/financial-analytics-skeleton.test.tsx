/**
 * @vitest-environment jsdom
 * The financial analytics loading state draws the page it stands in for
 * (66.2-39 fix round 4, G1).
 *
 * VD-113 removed the Revenue Breakdown card, so the first chart row's right
 * column holds the Expense Breakdown alone. The page kept that column's
 * `space-y-6` wrapper around one card (space-y spaces only between children,
 * so it did nothing) and the skeleton kept drawing two cards there: the loading
 * state showed a card the loaded page never has.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#components/ui/tooltip";
import { render } from "#test/utils/test-render";

// The page's two queries, on their own keys, answer with nothing: the page
// draws its defaults (no figures, no rows).
vi.mock("#hooks/api/use-analytics", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("#hooks/api/use-analytics")>();
	return {
		analyticsQueries: {
			...actual.analyticsQueries,
			financialPageData: () => ({
				...actual.analyticsQueries.financialPageData(),
				queryFn: async () => ({}),
			}),
			ownerPaymentSummary: () => ({
				...actual.analyticsQueries.ownerPaymentSummary(),
				queryFn: async () => null,
			}),
		},
	};
});
vi.mock("#components/shared/export-buttons", () => ({
	ExportButtons: () => null,
}));

import FinancialAnalyticsPage from "#app/(owner)/analytics/financial/page";
import { FinancialAnalyticsSkeleton } from "../financial-analytics-skeleton";

/** The first chart row: the grid with the two-column chart beside a third. */
function firstChartRow(container: HTMLElement): HTMLElement {
	const row = [...container.querySelectorAll<HTMLElement>(".grid")].find(
		(grid) => grid.className.includes("lg:grid-cols-3"),
	);
	if (!row) throw new Error("no first chart row");
	return row;
}

/** The cards (`bg-card` boxes) each grid item of `row` draws. */
function cardsPerColumn(row: HTMLElement): number[] {
	return [...row.children].map(
		(item) =>
			[...item.querySelectorAll(".bg-card")].length +
			(item.classList.contains("bg-card") ? 1 : 0),
	);
}

describe("the financial analytics first chart row", () => {
	it("is the chart beside one card, the breakdown as the grid's own item", async () => {
		// The app's providers supply the TooltipProvider the stat labels use.
		const { container } = render(
			<TooltipProvider>
				<FinancialAnalyticsPage />
			</TooltipProvider>,
		);
		await screen.findByText("Expense Breakdown");
		const row = firstChartRow(container);
		expect(cardsPerColumn(row)).toEqual([1, 1]);
		const [, breakdown] = [...row.children];
		expect(breakdown?.getAttribute("data-slot")).toBe("blur-fade");
		expect(breakdown?.textContent).toContain("Expense Breakdown");
	});

	it("loads as the same chart beside one card", () => {
		const { container } = render(<FinancialAnalyticsSkeleton />);
		expect(cardsPerColumn(firstChartRow(container))).toEqual([1, 1]);
	});
});
