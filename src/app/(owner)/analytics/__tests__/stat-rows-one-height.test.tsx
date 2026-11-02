/**
 * @vitest-environment jsdom
 * Each row of the restored stat tiles is one height (66.2-39, part M).
 *
 * A grid row stretches its items, but the items are BlurFade wrappers and the
 * tiles inside kept their own height, so a tile whose trend line or
 * description wrapped stood taller than its neighbours: measured on the
 * production build, the overview's tiles read 113/90/133/110 px at 1280 and
 * the expenses page's YoY tile 162 px beside a 110 px one at 390. Each wrapper
 * now fills its cell and each tile its wrapper, its rows held to the top.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FinancialOverviewStats } from "#app/(owner)/analytics/financial/_components/financial-overview-stats";
import { AnalyticsStatCards } from "#app/(owner)/analytics/overview/analytics-stat-cards";
import { ExpenseStats } from "#app/(owner)/reports/expenses/_components/expense-stats";
import { TooltipProvider } from "#components/ui/tooltip";
import { render } from "#test/utils/test-render";

function expectRowsOneHeight() {
	const tiles = [...document.querySelectorAll("[data-slot=stat]")];
	expect(tiles.length).toBeGreaterThan(0);
	for (const tile of tiles) {
		expect(tile.className).toContain("h-full");
		expect(tile.className).toContain("content-start");
		expect(tile.parentElement?.className ?? "").toContain("h-full");
	}
}

describe("stat rows", () => {
	it("hold the overview's tiles to one height", () => {
		render(
			<AnalyticsStatCards
				occupancyRate={75}
				activeTenants={3}
				monthlyRevenue={2470}
				scheduledMargin={12}
				openMaintenance={2}
				maintenanceTrend={undefined}
				trends={{
					occupancy: { status: "unavailable" },
					revenue: { status: "unavailable" },
				}}
			/>,
		);
		expectRowsOneHeight();
	});

	it("hold the expenses page's tiles to one height", () => {
		render(
			<ExpenseStats
				totalExpenses={1}
				monthlyAvg={1}
				yearOverYear={{ status: "unavailable" }}
			/>,
		);
		expectRowsOneHeight();
	});

	it("hold the financial overview's tiles to one height", () => {
		render(
			<TooltipProvider>
				<FinancialOverviewStats
					metrics={{
						totalRevenue: 1,
						totalCollected: 1,
						totalExpenses: 0,
						netIncome: 1,
						profitMargin: 100,
					}}
				/>
			</TooltipProvider>,
		);
		expectRowsOneHeight();
	});

	it("hold the maintenance insights' two chart cards to one height", () => {
		const source = readFileSync(
			join(
				process.cwd(),
				"src/components/analytics/maintenance-insights-section.tsx",
			),
			"utf8",
		);
		for (const delay of ["0.1", "0.2"]) {
			expect(source).toContain(
				`<BlurFade delay={${delay}} className="h-full">\n\t\t\t\t\t<div className="h-full bg-card`,
			);
		}
	});
});
