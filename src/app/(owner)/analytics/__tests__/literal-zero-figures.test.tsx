/**
 * @vitest-environment jsdom
 * Figures the RPCs returned as hard-coded literals reach the screen only once
 * the server computes them (66.2-39 fix round 1, parts K and M).
 *
 *  - get_dashboard_stats returned `units.occupancyChange` and `revenue.growth`
 *    as the literal 0, and get_dashboard_data_v2 compared today's leases with
 *    only the leases still active today. 20261102184501 computes both over a
 *    window it states; the overview's occupancy and revenue tiles show the
 *    change beside that window, and say it is unavailable without one.
 *  - get_expense_summary returned `year_over_year_change` as the literal null.
 *    20261102184502 computes it against a prior period it states; the YoY
 *    tile shows the change, or that there is no prior figure, or that it is
 *    unavailable, never "--" beside a green down-trend.
 *  - The financial analytics page's Billing Timeline and Invoice Summary cards
 *    had no source at all and stay deleted: the ledger figures they promised
 *    are the Payment Summary's (get_billing_insights) and no timeline exists.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsStatCards } from "#app/(owner)/analytics/overview/analytics-stat-cards";
import { ExpenseStats } from "#app/(owner)/reports/expenses/_components/expense-stats";
import { render } from "#test/utils/test-render";
import type { MetricTrend, PortfolioTrends } from "#types/analytics";

const WINDOW = { start_date: "2026-10-03", end_date: "2026-11-02" };

function renderCards(
	trends: PortfolioTrends | undefined,
	maintenanceTrend?: MetricTrend | null,
) {
	return render(
		<AnalyticsStatCards
			occupancyRate={75}
			activeTenants={14}
			monthlyRevenue={14250}
			scheduledMargin={12.3}
			openMaintenance={2}
			maintenanceTrend={maintenanceTrend}
			trends={trends}
		/>,
	);
}

function openTrend(change: number, window: MetricTrend["window"]): MetricTrend {
	return {
		current: 2,
		previous: 2 - change,
		change,
		percentChange: null,
		trend: change > 0 ? "up" : change < 0 ? "down" : "stable",
		window,
	};
}

/** The Open Maintenance tile's change line. */
function maintenanceLine(): HTMLElement | null {
	const tile = [...document.querySelectorAll("[data-slot=stat]")].find(
		(t) =>
			t.querySelector("[data-slot=stat-label]")?.textContent ===
			"Open Maintenance",
	);
	return (tile?.querySelector("[data-slot=stat-description] span") ??
		null) as HTMLElement | null;
}

/** The text of each tile's trend line, by label. */
function trendLines(): Record<string, string> {
	return Object.fromEntries(
		[...document.querySelectorAll("[data-slot=stat]")].map((tile) => [
			tile.querySelector("[data-slot=stat-label]")?.textContent ?? "",
			tile.querySelector("[data-slot=stat-trend]")?.textContent ?? "",
		]),
	);
}

describe("analytics overview stat cards", () => {
	it("show each change beside the days it compares", () => {
		renderCards({
			occupancy: { status: "ready", points: -25, window: WINDOW },
			revenue: { status: "ready", percent: -10.18, window: WINDOW },
		});
		expect(trendLines()).toMatchObject({
			"Occupancy Rate": "−25.0 ptsvs. 30 days ago",
			"Monthly Revenue": "−10.2%vs. 30 days ago",
		});
		expect(screen.getByText("12.3% scheduled margin")).toBeInTheDocument();
	});

	it("color a rise and a fall by direction", () => {
		renderCards({
			occupancy: { status: "ready", points: 2.5, window: WINDOW },
			revenue: { status: "ready", percent: -3, window: WINDOW },
		});
		const trends = [...document.querySelectorAll("[data-slot=stat-trend]")];
		expect(trends.map((t) => t.getAttribute("data-trend"))).toEqual([
			"up",
			"down",
		]);
		expect(trends[0]?.textContent).toBe("+2.5 ptsvs. 30 days ago");
	});

	it("say there is no prior figure when nothing was scheduled then", () => {
		renderCards({
			occupancy: { status: "ready", points: 75, window: WINDOW },
			revenue: { status: "ready", percent: null, window: WINDOW },
		});
		expect(trendLines()["Monthly Revenue"]).toBe(
			"No rent scheduled 30 days ago",
		);
		// No 0%, Infinity or NaN in its place.
		expect(trendLines()["Monthly Revenue"]).not.toMatch(/%|Infinity|NaN/);
	});

	it("say the change is unavailable when the server states no window", () => {
		renderCards({
			occupancy: { status: "unavailable" },
			revenue: { status: "unavailable" },
		});
		expect(trendLines()).toMatchObject({
			"Occupancy Rate": "Change unavailable",
			"Monthly Revenue": "Change unavailable",
		});
		expect(screen.queryByText(/vs\.? 30 days ago/)).not.toBeInTheDocument();
	});

	it("show no trend line while the dashboard payload loads", () => {
		renderCards(undefined);
		expect(document.querySelectorAll("[data-slot=stat-trend]")).toHaveLength(0);
	});

	// The open-maintenance line said "from last week" over get_dashboard_data_v2's
	// 30-day comparison (66.2-39 part P); it states the trend's own window.
	it.each([
		[2, "+2 vs. 30 days ago", "text-warning-text"],
		[-1, "−1 vs. 30 days ago", "text-success-text"],
		[0, "Unchanged vs. 30 days ago", "text-muted-foreground"],
	])(
		"state open maintenance's change of %s over its window",
		(change, text, tone) => {
			renderCards(undefined, openTrend(change, WINDOW));
			const line = maintenanceLine();
			expect(line?.textContent).toBe(text);
			expect(line?.className).toBe(tone);
			expect(document.body.textContent).not.toMatch(/last week/);
		},
	);

	it("say open maintenance's change is unavailable with no window, and show none without a trend", () => {
		renderCards(undefined, openTrend(-1, null));
		expect(maintenanceLine()?.textContent).toBe("Change unavailable");
		renderCards(undefined, null);
		renderCards(undefined, undefined);
		expect(screen.getAllByText("Change unavailable")).toHaveLength(1);
	});
});

describe("expenses stats", () => {
	function renderStats(
		yearOverYear: Parameters<typeof ExpenseStats>[0]["yearOverYear"],
	) {
		return render(
			<ExpenseStats
				totalExpenses={1200}
				monthlyAvg={100}
				yearOverYear={yearOverYear}
			/>,
		);
	}
	const PRIOR = { start_date: "2025-01-01", end_date: "2025-11-02" };

	// monthly_average is the trailing 12 months, zero-filled (get_expense_summary),
	// beside a year-to-date total: the tile said only "avg per month" (part P).
	it("state the monthly average's window", () => {
		renderStats({ status: "ready", change: 12.5, priorPeriod: PRIOR });
		expect(screen.getByText("per month, last 12 months")).toBeInTheDocument();
		expect(screen.getByText("year to date")).toBeInTheDocument();
		expect(screen.queryByText("avg per month")).not.toBeInTheDocument();
	});

	it("show no Maintenance tile, which could only restate Total Expenses", () => {
		// Every expense is on a maintenance request and the categories are
		// vendor names: the tile looked for a "maintenance" category and read $0.
		renderStats({ status: "ready", change: 12.5, priorPeriod: PRIOR });
		const labels = [...document.querySelectorAll("[data-slot=stat-label]")].map(
			(label) => label.textContent,
		);
		expect(labels).toEqual(["Total Expenses", "Monthly Average", "YoY Change"]);
		expect(screen.queryByText(/% of total/)).not.toBeInTheDocument();
	});

	it("show the year over year against the prior period", () => {
		renderStats({ status: "ready", change: 12.5, priorPeriod: PRIOR });
		expect(screen.getByText("YoY Change")).toBeInTheDocument();
		const tile = screen.getByText("YoY Change").closest("[data-slot=stat]");
		expect(tile?.querySelector("[data-slot=stat-value]")?.textContent).toBe(
			"+12.5%",
		);
		expect(tile?.querySelector("[data-slot=stat-value]")?.className).toContain(
			"text-destructive-text",
		);
		expect(screen.getByText("vs Jan 1 to Nov 2, 2025")).toBeInTheDocument();
	});

	it("show a fall in spending as a fall", () => {
		renderStats({ status: "ready", change: -4.04, priorPeriod: PRIOR });
		const value = screen
			.getByText("YoY Change")
			.closest("[data-slot=stat]")
			?.querySelector("[data-slot=stat-value]");
		expect(value?.textContent).toBe("−4.0%");
		expect(value?.className).toContain("text-success-text");
	});

	it("say there is no prior figure when nothing was spent then", () => {
		renderStats({ status: "ready", change: null, priorPeriod: PRIOR });
		expect(screen.getByText("No prior figure")).toBeInTheDocument();
		expect(
			screen.getByText("Nothing spent Jan 1 to Nov 2, 2025"),
		).toBeInTheDocument();
		expect(screen.queryByText("--")).not.toBeInTheDocument();
	});

	it("say the change is unavailable when the server states no prior period", () => {
		renderStats({ status: "unavailable" });
		expect(screen.getByText("Unavailable")).toBeInTheDocument();
		expect(screen.getByText("Year-over-year pending")).toBeInTheDocument();
		expect(screen.queryByText("--")).not.toBeInTheDocument();
	});
});

describe("financial analytics page", () => {
	const source = readFileSync(
		join(process.cwd(), "src/app/(owner)/analytics/financial/page.tsx"),
		"utf8",
	);

	it("renders no Billing Timeline or Invoice Summary card", () => {
		expect(source).not.toContain("Billing Timeline");
		expect(source).not.toContain("Invoice Summary");
		expect(source).not.toContain("BillingTimelineChart");
		expect(source).not.toContain("InvoiceSummaryList");
	});
});
