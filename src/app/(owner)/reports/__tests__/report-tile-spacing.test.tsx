/**
 * The report tiles keep the spacing their classes declare (66.2-39 fix round
 * 3, the G2/G4 report cases). globals.css' `@layer base` `p { margin-bottom:
 * 1rem }` cannot leave a padded box or a flex item, so it stood under each
 * tile's label and between a figure and its label:
 * - cash flow's activity tiles read 116px tall in Chrome, 16px figure to
 *   label and 32px under it, where p-4 and mt-1 declare 16 and 4;
 * - the tax documents' summary cards read 114px, and each vendor row 101px
 *   with the name 8px off the amount column's center line;
 * - the year-end summary cards read 158px, 49px above the figure (the Card's
 *   own py-6 plus a v3 pt-6) and 41px under the label.
 * Every such paragraph must neutralize the base margin (read from globals.css
 * by `computeParagraphCascade`), and the year-end card must add no top
 * padding of its own.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import type { TaxDocumentsResult } from "#types/financial-statements";

const { useTaxDocumentsMock } = vi.hoisted(() => ({
	useTaxDocumentsMock: vi.fn(),
}));
vi.mock("#hooks/api/use-expense-mutations", () => ({
	useTaxDocuments: useTaxDocumentsMock,
}));
vi.mock("#hooks/api/use-report-mutations", () => ({
	useDownloadTaxDocumentPdf: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { CashFlowActivity } from "#app/(owner)/reports/cash-flow/cash-flow-activity";
import TaxDocumentsPage from "#app/(owner)/reports/tax-documents/page";
import { YearEndReportSection } from "#components/reports/sections/year-end-report-section";

function expectNoBaseMargin(paragraphs: Element[], count: number) {
	expect(paragraphs).toHaveLength(count);
	for (const paragraph of paragraphs) {
		const { neutralized, baseline } = computeParagraphCascade(paragraph);
		expect(baseline.marginBottom).toBe("16px");
		expect(
			neutralized.marginBottom,
			paragraph.textContent ?? "a paragraph",
		).toBe("0px");
	}
}

const TAX: TaxDocumentsResult = {
	status: "ready",
	documents: {
		period: {
			start_date: "2025-01-01",
			end_date: "2025-12-31",
			label: "Tax Year 2025",
		},
		taxYear: 2025,
		totals: { totalIncome: 12000, totalExpenses: 760.5, netIncome: 11239.5 },
		expenseCategories: [
			{ category: "Plumber", amount: 500, percentage: 65.7 },
			{ category: "Electrician", amount: 260.5, percentage: 34.3 },
		],
	},
};

describe("report tiles hold their declared spacing", () => {
	it("cash flow's activity tiles", () => {
		render(
			<CashFlowActivity netOperatingCash={1214.5} netFinancingCash={260.5} />,
		);
		for (const label of ["Operating Activities", "Financing Activities"]) {
			const tile = screen.getByText(label).parentElement;
			if (!tile) throw new Error(`no tile for ${label}`);
			expectNoBaseMargin([...tile.querySelectorAll("p")], 2);
		}
	});

	it("the tax documents' summary cards and vendor rows", () => {
		useTaxDocumentsMock.mockReturnValue({
			data: TAX,
			isLoading: false,
			error: null,
			refetch: vi.fn(),
		});
		render(<TaxDocumentsPage />);
		for (const label of ["Rent Received", "Operating Expenses", "Net Income"]) {
			const block = screen.getByText(label).parentElement;
			if (!block) throw new Error(`no card for ${label}`);
			expectNoBaseMargin([...block.querySelectorAll("p")], 2);
		}
		const vendors = document.querySelector(
			"section[aria-labelledby=tax-expenses-by-vendor] .divide-y",
		);
		const rows = [...(vendors?.children ?? [])];
		expect(rows).toHaveLength(2);
		for (const row of rows) {
			expectNoBaseMargin([...row.querySelectorAll("p")], 3);
		}
	});

	// 66.2-39 fix round 4 (G14): the error card's text block is a flex item of
	// the card, so the title's base margin met the message's mt-1 (16 apart
	// where 4 is declared) and the message's stood 16px inside the block (32
	// to Try Again where gap-4 declares 16).
	it("the tax documents' error card", () => {
		useTaxDocumentsMock.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error("network"),
			refetch: vi.fn(),
		});
		render(<TaxDocumentsPage />);
		const title = screen.getByText("Failed to load tax documents");
		const block = title.parentElement;
		if (!block) throw new Error("no text block for the error card");
		expectNoBaseMargin([...block.querySelectorAll("p")], 2);
	});

	it("the year-end summary cards", async () => {
		render(
			<YearEndReportSection
				year={2025}
				yearEndData={{
					year: 2025,
					rentReceived: 12000,
					operatingExpenses: 760.5,
					netIncome: 11239.5,
					byProperty: [],
					expenseByCategory: [],
				}}
				ledgerUnavailable={false}
				isLoadingYearEnd={false}
				onDownloadYearEndCsv={vi.fn()}
				isExportingYearEnd={false}
			/>,
		);
		const designSystem = await loadProjectDesignSystem();
		for (const label of ["Rent Received", "Operating Expenses", "Net Income"]) {
			const content = screen
				.getAllByText(label)
				.map((el) => el.closest("[data-slot=card-content]"))
				.find((el) => el !== null);
			if (!content) throw new Error(`no summary card for ${label}`);
			const css = designSystem
				.candidatesToCss([...content.classList])
				.filter((rule): rule is string => rule !== null)
				.join("\n");
			expect(css, label).not.toMatch(/padding(-top|-block)?\s*:/);
			expectNoBaseMargin([...content.querySelectorAll("p")], 2);
		}
	}, 30_000);
});
