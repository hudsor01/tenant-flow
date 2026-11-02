/**
 * Pin the Scheduled vs Collected relabel (LEDGER-07, D-07).
 *
 * The lease-derived figure is labeled "Scheduled" and the ledger-derived figure
 * is labeled "Collected". Each carries its own tooltip, the word "Revenue" is
 * gone from the card labels, the two are never rendered as one summed number,
 * and the two figures derived from Scheduled minus expenses say so (66.2-39,
 * part M): get_financial_overview's revenue is the active leases' rent times
 * twelve, so "Net Income", "Portfolio ROI" and "Cash Flow" (Net Income again)
 * named scheduled rent as income and cash.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinancialOverviewStats } from "#app/(owner)/analytics/financial/_components/financial-overview-stats";
import { TooltipProvider } from "#components/ui/tooltip";
import type { FinancialMetricSummary } from "#types/analytics";

const metrics: FinancialMetricSummary = {
	totalRevenue: 120000,
	totalCollected: 97500,
	totalExpenses: 30000,
	netIncome: 90000,
	profitMargin: 75,
};

function labels(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll("[data-slot=stat-label]")).map(
		(node) => node.textContent?.trim() ?? "",
	);
}

describe("FinancialOverviewStats", () => {
	it("labels the lease-derived figure Scheduled and drops the Revenue label", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />, {
			wrapper: TooltipProvider,
		});

		expect(labels(container)).toContain("Scheduled");
		expect(labels(container).join(" ")).not.toContain("Revenue");
	});

	it("shows Collected as a separate labeled figure", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />, {
			wrapper: TooltipProvider,
		});

		expect(labels(container)).toContain("Collected");
		// Two distinct cards, not one merged figure.
		expect(container.querySelectorAll("[data-slot=stat-label]").length).toBe(4);
	});

	it("gives each of the two figures its own tooltip trigger", () => {
		render(<FinancialOverviewStats metrics={metrics} />, {
			wrapper: TooltipProvider,
		});

		expect(
			screen.getByRole("button", { name: /Scheduled/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Collected/ }),
		).toBeInTheDocument();
	});

	it("never renders scheduled + collected as a single summed number", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />, {
			wrapper: TooltipProvider,
		});

		const summed = String(metrics.totalRevenue + metrics.totalCollected);
		expect(container.textContent).not.toContain(summed);
		expect(container.textContent).not.toContain("217,500");
	});

	it("names the figures derived from scheduled rent as scheduled, not income or cash", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />, {
			wrapper: TooltipProvider,
		});

		expect(labels(container)).toEqual([
			"Scheduled",
			"Collected",
			"Scheduled Net",
			"Scheduled Margin",
		]);
		expect(labels(container).join(" ")).not.toMatch(/Income|Cash|ROI/);
		expect(screen.getByText("Scheduled minus expenses")).toBeInTheDocument();
		expect(
			screen.getByText("Scheduled net over scheduled"),
		).toBeInTheDocument();
	});

	it("shows no trend chip: no prior-period figure exists for one", () => {
		const { container } = render(<FinancialOverviewStats metrics={metrics} />, {
			wrapper: TooltipProvider,
		});

		expect(container.querySelectorAll("[data-slot=stat-trend]")).toHaveLength(
			0,
		);
		expect(container.textContent).not.toMatch(
			/vs last period|expense trend|operating cash|profit margin/,
		);
	});

	it("puts a loss's sign before the dollar sign on Scheduled Net", async () => {
		// The cards rendered -250 as "$-250": a "$" span sat before the ticker.
		// Reduced motion, so each ticker shows its final value without a timer.
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query.includes("prefers-reduced-motion"),
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));
		const { container } = render(
			<FinancialOverviewStats metrics={{ ...metrics, netIncome: -250 }} />,
			{ wrapper: TooltipProvider },
		);
		const value = (label: string) => {
			const stat = Array.from(
				container.querySelectorAll("[data-slot=stat]"),
			).find(
				(node) =>
					node.querySelector("[data-slot=stat-label]")?.textContent?.trim() ===
					label,
			);
			return stat?.querySelector("[data-slot=stat-value]")?.textContent;
		};
		await waitFor(() => expect(value("Scheduled Net")).toBe("-$250"));
		expect(container.textContent).not.toContain("$-");
		vi.unstubAllGlobals();
	});
});
