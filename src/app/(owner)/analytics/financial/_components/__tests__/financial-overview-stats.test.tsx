/**
 * Pin the Scheduled vs Collected relabel (LEDGER-07, D-07).
 *
 * The lease-derived figure is labeled "Scheduled" and the ledger-derived figure
 * is labeled "Collected". Each carries its own tooltip, the word "Revenue" is
 * gone from the card labels, the two are never rendered as one summed number,
 * and Net Income / Cash Flow still come from Scheduled minus expenses.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinancialOverviewStats } from "#app/(owner)/analytics/financial/_components/financial-overview-stats";
import type { FinancialMetricSummary } from "#types/analytics";

const metrics: FinancialMetricSummary = {
	totalRevenue: 120000,
	totalCollected: 97500,
	totalExpenses: 30000,
	netIncome: 90000,
	cashFlow: 90000,
	profitMargin: 75,
};

function labels(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll("[data-slot=stat-label]")).map(
		(node) => node.textContent?.trim() ?? "",
	);
}

describe("FinancialOverviewStats", () => {
	it("labels the lease-derived figure Scheduled and drops the Revenue label", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />);

		expect(labels(container)).toContain("Scheduled");
		expect(labels(container).join(" ")).not.toContain("Revenue");
	});

	it("shows Collected as a separate labeled figure", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />);

		expect(labels(container)).toContain("Collected");
		// Two distinct cards, not one merged figure.
		expect(
			container.querySelectorAll("[data-slot=stat-label]").length,
		).toBeGreaterThanOrEqual(5);
	});

	it("gives each of the two figures its own tooltip trigger", () => {
		render(<FinancialOverviewStats metrics={metrics} />);

		expect(
			screen.getByRole("button", { name: /Scheduled/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Collected/ }),
		).toBeInTheDocument();
	});

	it("never renders scheduled + collected as a single summed number", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />);

		const summed = String(metrics.totalRevenue + metrics.totalCollected);
		expect(container.textContent).not.toContain(summed);
		expect(container.textContent).not.toContain("217,500");
	});

	it("keeps Net Income and Cash Flow on the scheduled basis", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />);

		expect(labels(container)).toContain("Net Income");
		expect(labels(container)).toContain("Cash Flow");
		expect(screen.getByText("Scheduled minus expenses")).toBeInTheDocument();
	});
});
