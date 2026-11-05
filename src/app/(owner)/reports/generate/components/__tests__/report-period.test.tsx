/**
 * A report the page's Report Period does not apply to says so on its card
 * (66.2-39 fix round 1, part N; cycle 2, F9): get_maintenance_analytics and
 * get_dashboard_stats take no dates, so the maintenance and lease portfolio
 * reports are to date, and the tax preparation report covers the tax year of
 * the period's end, today. The three reports built over the period (the
 * executive summary, financial performance and property portfolio) do not.
 * Each file is named by what it covers.
 */
import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { downloads } = vi.hoisted(() => ({ downloads: [] as string[] }));
vi.mock("#lib/reports/download-blob", () => ({
	downloadBlob: (_blob: Blob, name: string) => downloads.push(name),
}));
vi.mock("#lib/reports/report-data", async (importOriginal) => ({
	...(await importOriginal<typeof import("#lib/reports/report-data")>()),
	buildReportData: async () => ({
		title: "t",
		subtitle: "s",
		generatedAt: "2026-11-05T12:00:00.000Z",
		periodStart: "2026-10-05",
		periodEnd: "2026-11-05",
		sections: [],
	}),
}));

import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { ReportCardGrid } from "../report-card-grid";
import { reportCards, reportsClient } from "../report-types";

describe("the generate page's report cards", () => {
	it("mark only the reports the period does not apply to, with the reason", () => {
		expect(
			reportCards
				.filter((card) => card.coverage !== undefined)
				.map((card) => [card.id, card.coverage?.kind]),
		).toEqual([
			["lease-portfolio", "to-date"],
			["maintenance-operations", "to-date"],
			["tax-preparation", "tax-year"],
		]);
	});

	// The reason is a flex item of the card's `flex flex-col gap-3` content,
	// so globals.css' `p { margin-bottom: 1rem }` could not collapse: it added
	// 16px to the gap above the buttons (cycle 2, F20).
	it("set the reason with no base paragraph margin", () => {
		render(
			<ReportCardGrid
				title="Operations Reports"
				description="Property and maintenance operations insights"
				reports={reportCards.filter((card) => card.category === "operations")}
				generatingReports={{}}
				onGenerate={() => undefined}
			/>,
		);
		const reason = screen.getByText(
			"Covers every request to date; the report period doesn't apply.",
		);
		const { neutralized, baseline } = computeParagraphCascade(reason);
		expect(baseline.marginBottom).toBe("16px");
		expect(neutralized.marginBottom).toBe("0px");
	});

	it("show the tax preparation card's reason", () => {
		render(
			<ReportCardGrid
				title="Financial Reports"
				description="Detailed financial analysis and performance metrics"
				reports={reportCards.filter((card) => card.category === "financial")}
				generatingReports={{}}
				onGenerate={() => undefined}
			/>,
		);
		expect(
			screen.getByText(
				"Covers this calendar year, the tax year; the report period doesn't apply.",
			),
		).toBeInTheDocument();
	});

	it("show the reason on the card, so the period control is not offered there", () => {
		render(
			<ReportCardGrid
				title="Operations Reports"
				description="Property and maintenance operations insights"
				reports={reportCards.filter((card) => card.category === "operations")}
				generatingReports={{}}
				onGenerate={() => undefined}
			/>,
		);
		expect(
			screen.getByText(
				"Covers every request to date; the report period doesn't apply.",
			),
		).toBeInTheDocument();
		expect(screen.getAllByText(/the report period doesn't apply/)).toHaveLength(
			1,
		);
	});

	describe("name each file by what it covers", () => {
		beforeEach(() => {
			downloads.length = 0;
		});
		it.each([
			[
				"financial-performance",
				/^financial-performance_2026-10-05_2026-11-05_/,
			],
			["lease-portfolio", /^lease-portfolio_to_2026-11-05_/],
			["tax-preparation", /^tax-preparation_2026_\d{4}-/],
		] as const)("%s", async (id, name) => {
			await reportsClient.generateReport(
				id,
				{ start_date: "2026-10-05", end_date: "2026-11-05", format: "excel" },
				new QueryClient(),
			);
			expect(downloads).toHaveLength(1);
			expect(downloads[0]).toMatch(name);
		});
	});

	it("claim no figure the reports do not compute", () => {
		const descriptions = reportCards.map((card) => card.description).join(" ");
		for (const claim of [
			"profitability scores",
			"lifecycle trends",
			"depreciation calculations",
			"vacancy analysis",
			"NOI by property",
			"monthly trends",
			// An expense has no category: get_expense_summary groups by vendor,
			// and the file's section is Expenses by Vendor (cycle 2, F10).
			"expense categories",
		]) {
			expect(descriptions).not.toContain(claim);
		}
		expect(
			reportCards.find((card) => card.id === "financial-performance")
				?.description,
		).toContain("expenses by vendor");
	});
});
