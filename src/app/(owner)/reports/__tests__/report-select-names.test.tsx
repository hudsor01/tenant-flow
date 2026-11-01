/**
 * @vitest-environment jsdom
 * Report period / year / month Select triggers are named (66.2-39).
 *
 * The balance sheet, cash flow, income statement and tax documents headers
 * (and the year-end report) rendered SelectTriggers with no accessible name: a screen reader announced
 * a bare "combobox". Each trigger's name now starts with the value it shows
 * (WCAG 2.5.3) and then says what it picks.
 */

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectLabelInName } from "#test/utils/label-in-name";
import { render } from "#test/utils/test-render";

vi.mock("#hooks/api/use-financials", () => ({
	useBalanceSheet: () => ({
		data: undefined,
		isLoading: false,
		error: null,
		refetch: vi.fn(),
	}),
}));
vi.mock("#hooks/api/use-expense-mutations", () => ({
	useTaxDocuments: () => ({ data: undefined, isLoading: false, error: null }),
}));
vi.mock("#hooks/api/use-report-mutations", () => ({
	useDownloadTaxDocumentPdf: () => ({ mutate: vi.fn(), isPending: false }),
	useDownloadYearEndPdf: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("#hooks/api/use-reports", () => ({
	useYearEndSummary: () => ({ data: undefined, isLoading: false, error: null }),
	useReport1099Summary: () => ({
		data: undefined,
		isLoading: false,
		error: null,
	}),
}));
vi.mock("#components/reports/sections/year-end-report-section", () => ({
	YearEndReportSection: () => null,
}));

import BalanceSheetPage from "#app/(owner)/reports/balance-sheet/page";
import { CashFlowHeader } from "#app/(owner)/reports/cash-flow/cash-flow-header";
import { IncomeStatementPageHeader } from "#app/(owner)/reports/income-statement/income-statement-page-header";
import TaxDocumentsPage from "#app/(owner)/reports/tax-documents/page";
import YearEndReportsPage from "#app/(owner)/reports/year-end/page";

function expectNamedTriggers(expected: RegExp[]) {
	const triggers = screen.getAllByRole("combobox");
	expect(triggers).toHaveLength(expected.length);
	triggers.forEach((trigger, index) => {
		const pattern = expected[index];
		if (!pattern) throw new Error(`no expected name for trigger ${index}`);
		expect(screen.getByRole("combobox", { name: pattern })).toBe(trigger);
		expectLabelInName(trigger);
	});
}

describe("report Select triggers", () => {
	it("cash flow: period and year", () => {
		render(
			<CashFlowHeader
				period="quarterly"
				year="2025"
				onPeriodChange={() => undefined}
				onYearChange={() => undefined}
			/>,
		);
		expectNamedTriggers([/^Quarterly \(period\)$/, /^2025 \(year\)$/]);
	});

	it("income statement: period and year", () => {
		render(
			<IncomeStatementPageHeader
				period="monthly"
				year="2025"
				onPeriodChange={() => undefined}
				onYearChange={() => undefined}
			/>,
		);
		expectNamedTriggers([/^Monthly \(period\)$/, /^2025 \(year\)$/]);
	});

	it("balance sheet: year and month", () => {
		render(<BalanceSheetPage />);
		expectNamedTriggers([/^\d{4} \(year\)$/, /^[A-Z][a-z]+ \(month\)$/]);
	});

	it("tax documents: tax year", () => {
		render(<TaxDocumentsPage />);
		expectNamedTriggers([/^\d{4} \(tax year\)$/]);
	});

	it("year-end: year", () => {
		render(<YearEndReportsPage />);
		expectNamedTriggers([/^\d{4} \(year\)$/]);
	});
});
