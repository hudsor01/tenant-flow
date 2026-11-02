/**
 * A report whose RPCs take no dates does not offer the page's Report Period
 * (66.2-39 fix round 1, part N): get_maintenance_analytics and
 * get_dashboard_stats take none, so the maintenance and lease portfolio
 * reports are to date. Their cards say so; the four reports built over the
 * period do not.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportCardGrid } from "../report-card-grid";
import { reportCards } from "../report-types";

describe("the generate page's report cards", () => {
	it("mark only the reports with no period as to date, with the reason", () => {
		expect(
			reportCards
				.filter((card) => card.toDateReason !== undefined)
				.map((card) => card.id),
		).toEqual(["lease-portfolio", "maintenance-operations"]);
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

	it("claim no figure the reports do not compute", () => {
		const descriptions = reportCards.map((card) => card.description).join(" ");
		for (const claim of [
			"profitability scores",
			"lifecycle trends",
			"depreciation calculations",
			"vacancy analysis",
			"NOI by property",
			"monthly trends",
		]) {
			expect(descriptions).not.toContain(claim);
		}
	});
});
