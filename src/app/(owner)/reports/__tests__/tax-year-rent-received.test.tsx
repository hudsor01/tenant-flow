/**
 * @vitest-environment jsdom
 * The year-end report and the tax documents present rent received, from the
 * rent ledger, as the tax year's income (66.2-39 part L).
 *
 * Before, both showed today's scheduled rent times twelve as any year's
 * "Gross Rental Income" / "Gross Income", the year-end By Property table each
 * property's last 30 days at $0, and the year-end cards "$0.00" whenever the
 * summary was missing. They now say "Rent Received", and say the ledger
 * totals are unavailable, with no $0, when the server cannot report them yet.
 */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import { render } from "#test/utils/test-render";
import type { TaxDocumentsResult } from "#types/financial-statements";
import type { YearEndSummary } from "#types/reports";

const { useTaxDocumentsMock, downloadPdfMock } = vi.hoisted(() => ({
	useTaxDocumentsMock: vi.fn(),
	downloadPdfMock: vi.fn(),
}));
vi.mock("#hooks/api/use-expense-mutations", () => ({
	useTaxDocuments: useTaxDocumentsMock,
}));
vi.mock("#hooks/api/use-report-mutations", () => ({
	useDownloadTaxDocumentPdf: () => ({
		mutate: downloadPdfMock,
		isPending: false,
	}),
}));

import TaxDocumentsPage from "#app/(owner)/reports/tax-documents/page";
import { YearEndReportSection } from "#components/reports/sections/year-end-report-section";

const SUMMARY: YearEndSummary = {
	year: 2025,
	rentReceived: 61200.25,
	operatingExpenses: 11120.5,
	netIncome: 50079.75,
	byProperty: [
		{
			propertyId: "p1",
			propertyName: "Maple Court",
			rentReceived: 36000,
			expenses: 9000.5,
			netIncome: 26999.5,
		},
	],
	expenseByCategory: [{ category: "Acme Plumbing", amount: 11120.5 }],
};

function section(props: {
	yearEndData: YearEndSummary | undefined;
	ledgerUnavailable: boolean;
}) {
	return (
		<YearEndReportSection
			year={2025}
			isLoadingYearEnd={false}
			onDownloadYearEndCsv={vi.fn()}
			isExportingYearEnd={false}
			{...props}
		/>
	);
}

describe("the year-end summary", () => {
	// get_expense_summary's categories are vendor names (66.2-39 part P): the
	// card said "Operating expenses by category" over a "Category" column.
	it("names its expense breakdown by vendor, each vendor as entered", () => {
		render(
			section({
				yearEndData: {
					...SUMMARY,
					expenseByCategory: [{ category: "acme_plumbing", amount: 11120.5 }],
				},
				ledgerUnavailable: false,
			}),
		);
		expect(screen.getByText("Expenses by vendor for 2025")).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Vendor" }),
		).toBeInTheDocument();
		expect(screen.getByText("acme_plumbing")).toBeInTheDocument();
		expect(screen.queryByText(/by category/i)).not.toBeInTheDocument();
	});

	it("shows the year's rent received and each property's", () => {
		render(section({ yearEndData: SUMMARY, ledgerUnavailable: false }));
		// The card's label and the By Property column.
		expect(screen.getAllByText("Rent Received")).toHaveLength(2);
		expect(screen.getByText("$61,200.25")).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Rent Received" }),
		).toBeInTheDocument();
		expect(screen.getByText("$36,000.00")).toBeInTheDocument();
		expect(screen.queryByText("Gross Rental Income")).not.toBeInTheDocument();
	});

	it("says the ledger totals are unavailable, with no $0", () => {
		render(section({ yearEndData: undefined, ledgerUnavailable: true }));
		expect(screen.getByText("Ledger totals unavailable")).toBeInTheDocument();
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
		expect(screen.queryByText("Rent Received")).not.toBeInTheDocument();
	});

	// The v4 Card pads itself (py-6); the card's CardContent added the v3
	// pt-6 on top (48px above its title), and globals.css' `p` margin, which
	// cannot leave a flex item, added 16px under it and between its two lines
	// (cycle 2, F67).
	it("pads the unavailable card only as the Card does, with no base paragraph margin", async () => {
		render(section({ yearEndData: undefined, ledgerUnavailable: true }));
		const content = document.querySelector("[data-slot=card-content]");
		if (!content) throw new Error("the card rendered no content");
		const designSystem = await loadProjectDesignSystem();
		const css = designSystem
			.candidatesToCss([...content.classList])
			.filter((rule): rule is string => rule !== null)
			.join("\n");
		expect(css).not.toMatch(/padding(-top|-block)?\s*:/);
		const lines = [...content.querySelectorAll("p")];
		expect(lines).toHaveLength(2);
		for (const line of lines) {
			const { neutralized, baseline } = computeParagraphCascade(line);
			expect(baseline.marginBottom).toBe("16px");
			expect(neutralized.marginBottom).toBe("0px");
		}
	}, 30_000);

	it("writes Unavailable, not $0.00, on a card it has no summary for", () => {
		render(section({ yearEndData: undefined, ledgerUnavailable: false }));
		expect(screen.getAllByText("Unavailable")).toHaveLength(3);
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
	});
});

function taxDocuments(result: TaxDocumentsResult) {
	useTaxDocumentsMock.mockReturnValue({
		data: result,
		isLoading: false,
		error: null,
		refetch: vi.fn(),
	});
	render(<TaxDocumentsPage />);
}

describe("the tax documents", () => {
	it("show the tax year's rent received as its income", () => {
		taxDocuments({
			status: "ready",
			documents: {
				period: {
					start_date: "2025-01-01",
					end_date: "2025-12-31",
					label: "Tax Year 2025",
				},
				taxYear: 2025,
				totals: {
					totalIncome: 61200.25,
					totalExpenses: 11120.5,
					netIncome: 50079.75,
				},
				expenseCategories: [],
			},
		});
		expect(screen.getByText("Rent Received")).toBeInTheDocument();
		expect(screen.getByText("$61,200.25")).toBeInTheDocument();
		expect(screen.queryByText("Gross Income")).not.toBeInTheDocument();
	});

	// TenantFlow does not decide which expenses are deductible: the section
	// read "Deductible Expenses — Schedule E" over every vendor, marked
	// deductible, beside "Total Deductions" and "Net Taxable Income".
	it("list each vendor's expenses with the deductibility note, claiming no deduction", () => {
		taxDocuments({
			status: "ready",
			documents: {
				period: {
					start_date: "2025-01-01",
					end_date: "2025-12-31",
					label: "Tax Year 2025",
				},
				taxYear: 2025,
				totals: {
					totalIncome: 61200.25,
					totalExpenses: 11120.5,
					netIncome: 50079.75,
				},
				expenseCategories: [
					{ category: "Acme Plumbing", amount: 9000.5, percentage: 80.9 },
					{ category: "No vendor recorded", amount: 2120, percentage: 19.1 },
				],
			},
		});
		const section = screen.getByRole("region", { name: "Expenses by Vendor" });
		expect(section).toHaveTextContent(
			"TenantFlow doesn't decide which expenses are deductible; review them with your tax preparer.",
		);
		// The note is the last child of the header's p-4 box, so globals.css'
		// `p { margin-bottom: 1rem }` could not collapse past the padding: 32px
		// under it against 16px over the heading (cycle 2, F28).
		const note = screen.getByText(
			"TenantFlow doesn't decide which expenses are deductible; review them with your tax preparer.",
		);
		const { neutralized, baseline } = computeParagraphCascade(note);
		expect(baseline.marginBottom).toBe("16px");
		expect(neutralized.marginBottom).toBe("0px");
		expect(section).toHaveTextContent("Acme Plumbing");
		expect(section).toHaveTextContent("No vendor recorded");
		expect(screen.getByText("Operating Expenses")).toBeInTheDocument();
		expect(screen.getByText("Net Income")).toBeInTheDocument();
		expect(document.body).not.toHaveTextContent(
			/deductible expenses|deductions|taxable|schedule e/i,
		);
	});

	// A $1,500 receipt dated 2024-12-20 reversed on 2025-01-05, nothing else in
	// 2025: the year's rent received is -1500, and the year-end page shows it.
	it("show a tax year whose rent received is negative, with its PDF (cycle 2, F21)", () => {
		taxDocuments({
			status: "ready",
			documents: {
				period: {
					start_date: "2025-01-01",
					end_date: "2025-12-31",
					label: "Tax Year 2025",
				},
				taxYear: 2025,
				totals: { totalIncome: -1500, totalExpenses: 0, netIncome: -1500 },
				expenseCategories: [],
			},
		});
		expect(screen.queryByText(/^No data for/)).not.toBeInTheDocument();
		expect(screen.getAllByText("-$1,500.00")).toHaveLength(2);
		expect(
			screen.getByRole("button", { name: "Download PDF of the tax documents" }),
		).toBeEnabled();
	});

	// Download PDF keeps its tab stop and says why it is off, as the
	// statements' Export does (cycle 2, F22, OD-12).
	it("say the ledger totals are unavailable, and say why there is no PDF", () => {
		downloadPdfMock.mockReset();
		taxDocuments({ status: "ledger-unavailable", taxYear: 2025 });
		expect(screen.getByText("Ledger totals unavailable")).toBeInTheDocument();
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
		const button = screen.getByRole("button", {
			name: "Download PDF of the tax documents",
		});
		expect(button).not.toBeDisabled();
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"The rent ledger totals the tax documents are built on aren't available yet.",
		);
		fireEvent.click(button);
		expect(downloadPdfMock).not.toHaveBeenCalled();
	});

	it("say why there is no PDF for a year with nothing recorded", () => {
		downloadPdfMock.mockReset();
		taxDocuments({
			status: "ready",
			documents: {
				period: {
					start_date: "2026-01-01",
					end_date: "2026-12-31",
					label: "Tax Year 2026",
				},
				taxYear: 2026,
				totals: { totalIncome: 0, totalExpenses: 0, netIncome: 0 },
				expenseCategories: [],
			},
		});
		const button = screen.getByRole("button", {
			name: "Download PDF of the tax documents",
		});
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			`No rent received or expenses recorded for tax year ${new Date().getFullYear()}.`,
		);
		fireEvent.click(button);
		expect(downloadPdfMock).not.toHaveBeenCalled();
	});

	it("download the PDF of a year with figures", () => {
		downloadPdfMock.mockReset();
		taxDocuments({
			status: "ready",
			documents: {
				period: {
					start_date: "2026-01-01",
					end_date: "2026-12-31",
					label: "Tax Year 2026",
				},
				taxYear: 2026,
				totals: { totalIncome: 1000, totalExpenses: 0, netIncome: 1000 },
				expenseCategories: [],
			},
		});
		const button = screen.getByRole("button", {
			name: "Download PDF of the tax documents",
		});
		expect(button).not.toHaveAttribute("aria-disabled");
		expect(button).not.toHaveAttribute("aria-describedby");
		fireEvent.click(button);
		expect(downloadPdfMock).toHaveBeenCalledWith(new Date().getFullYear());
	});
});
