/**
 * @vitest-environment jsdom
 * Figures the RPCs return as hard-coded literals do not reach the screen
 * (66.2-39 fix round 1, part K, item 4).
 *
 *  - get_dashboard_stats returns `units.occupancyChange` and `revenue.growth` as
 *    the literal 0, so the analytics overview's "0% vs last period", "+0 this
 *    month" (occupancyChange x 10) and "0% growth" trends were never figures.
 *  - get_expense_summary returns `year_over_year_change` as the literal null, so
 *    the expenses page's YoY tile only ever read "--" beside a green down-trend.
 *  - The financial analytics page's Billing Timeline and Invoice Summary cards
 *    had no source at all (their mapper fields were hard-coded empty) and
 *    promised figures that could never appear.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsStatCards } from "#app/(owner)/analytics/overview/analytics-stat-cards";
import { ExpenseStats } from "#app/(owner)/reports/expenses/_components/expense-stats";
import { render } from "#test/utils/test-render";

describe("analytics overview stat cards", () => {
	it("show no occupancy, tenant or revenue trend", () => {
		render(
			<AnalyticsStatCards
				occupancyRate={87.5}
				activeTenants={14}
				monthlyRevenue={14250}
				avgRoi={12.3}
				openMaintenance={2}
				maintenanceChange={-1}
			/>,
		);
		expect(screen.queryByText("vs last period")).not.toBeInTheDocument();
		expect(screen.queryByText("this month")).not.toBeInTheDocument();
		expect(screen.queryByText("growth")).not.toBeInTheDocument();
		// Open maintenance keeps its real week-over-week change.
		expect(screen.getByText("-1 from last week")).toBeInTheDocument();
		expect(screen.getByText("12.3% ROI")).toBeInTheDocument();
	});
});

describe("expenses stats", () => {
	it("have no year-over-year tile", () => {
		render(
			<ExpenseStats
				totalExpenses={1200}
				monthlyAvg={100}
				maintenanceTotal={0}
				maintenancePercent="0.0"
			/>,
		);
		expect(screen.queryByText("YoY Change")).not.toBeInTheDocument();
		expect(screen.queryByText("vs last year")).not.toBeInTheDocument();
		expect(screen.getByText("Total Expenses")).toBeInTheDocument();
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
