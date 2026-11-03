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
import { PerformanceStatCards } from "#app/(owner)/analytics/property-performance/performance-stat-cards";
import { LeasesStatCards } from "#app/(owner)/leases/leases-stat-cards";
import { ExpenseStats } from "#app/(owner)/reports/expenses/_components/expense-stats";
import { PropertyStatsSection } from "#components/properties/property-stats-section";
import { TenantStats } from "#components/tenants/tenant-stats";
import { TooltipProvider } from "#components/ui/tooltip";
import { render } from "#test/utils/test-render";

/**
 * Below lg every label keeps two lines' height (min-h-10, none from lg), the
 * rows held to the top, so a label that wraps at 390 leaves the figures in a
 * row on one line (part Q, measured on the production build).
 */
function expectTwoLineLabels() {
	expectRowsOneHeight();
	for (const label of document.querySelectorAll("[data-slot=stat-label]")) {
		expect(label.className).toContain("min-h-10");
		expect(label.className).toContain("lg:min-h-0");
	}
}

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
	// "Pending Signature" (66.2-39 part P, one label per lease status) wraps to
	// two lines at 390, measured on the production build: 113 x 40 beside a
	// 20-high "Expiring Soon". The grid row already stretches the tiles to one
	// height; each tile is a column with its figure row at the foot, so the two
	// figures in the row stay on one line.
	// "Total Tenants" and "Pending Signature" wrap at 390 (measured on the
	// production build: 40 high beside 20-high "Active" and "Ended"). Held to
	// the top, their figures sat 20 px below their neighbours' (part Q).
	it("keep the tenants tiles' figures on one line when a label wraps", () => {
		render(
			<TenantStats
				totalTenants={3}
				activeTenants={1}
				pendingTenants={1}
				endedTenants={1}
			/>,
		);
		expect(document.querySelectorAll("[data-slot=stat]")).toHaveLength(4);
		expectTwoLineLabels();
	});

	it("keep the leases tiles' figures on one line when a label wraps", () => {
		render(
			<LeasesStatCards
				totalLeases={2}
				activeLeases={1}
				expiringLeases={1}
				pendingLeases={1}
			/>,
		);
		const label = [...document.querySelectorAll("p")].find(
			(p) => p.textContent === "Pending Signature",
		);
		const tiles = [
			...(label?.closest(".grid")?.querySelectorAll(":scope > div") ?? []),
		];
		expect(tiles).toHaveLength(4);
		for (const tile of tiles) {
			expect(tile.className).toContain("flex-col");
			expect(tile.lastElementChild?.className ?? "").toContain("mt-auto");
		}
	});

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

	// "Scheduled Margin" wraps at 390 beside "Scheduled Net" (measured: its
	// figure 20 px lower, part Q).
	it("keep the financial overview's figures on one line when a label wraps", () => {
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
		expectTwoLineLabels();
	});

	// "Best performer" wraps at 390 beside "Rent received" (measured: its
	// figure 20 px lower, part Q).
	it("keep the property performance figures on one line when a label wraps", () => {
		render(
			<PerformanceStatCards
				metrics={{
					totalProperties: 2,
					totalUnits: 3,
					occupiedUnits: 2,
					averageOccupancy: 66.7,
					rentReceived: 1200,
					rentReceivedWindow: null,
					bestPerformer: "Oak House",
				}}
			/>,
		);
		expect(document.querySelectorAll("[data-slot=stat]")).toHaveLength(4);
		expectTwoLineLabels();
	});

	// "Occupied Rent" wraps at 390 beside "Available" (measured: its figure
	// 20 px lower, part Q).
	it("keep the properties page's figures on one line when a label wraps", () => {
		render(
			<PropertyStatsSection
				summary={{
					totalProperties: 2,
					totalUnits: 3,
					occupiedUnits: 2,
					availableUnits: 1,
					maintenanceUnits: 0,
					overallOccupancyRate: 67,
					totalMonthlyRevenue: 1800,
				}}
			/>,
		);
		const label = [...document.querySelectorAll("p")].find(
			(p) => p.textContent === "Occupied Rent",
		);
		const tiles = [
			...(label?.closest(".grid")?.querySelectorAll(":scope > div") ?? []),
		];
		expect(tiles).toHaveLength(4);
		for (const tile of tiles) {
			const tileLabel = tile.querySelector("p");
			expect(tileLabel?.className ?? "").toContain("min-h-10");
			expect(tileLabel?.className ?? "").toContain("lg:min-h-0");
		}
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
