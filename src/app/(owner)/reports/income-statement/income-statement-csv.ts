import { type CsvCell, csvIsoDate, csvNumber, toCsv } from "#lib/reports/csv";
import {
	STATEMENT_BASIS_HEADING,
	STATEMENT_BASIS_NOTE,
} from "#lib/reports/statement-basis";
import type { IncomeStatementView } from "./income-statement-view";

/**
 * The income statement as CSV: one row per figure on the page, top to bottom
 * (the three stat tiles and the profit margin, the revenue and expense
 * breakdowns with their totals, the net income summary), then the Basis of
 * Presentation note, one row per entry with no amount. Every row repeats the
 * period, the date range and the currency, so a filtered or pasted row keeps
 * its context. Amounts are dollars with 2 decimals and no symbol, signed as
 * the page shows them (the summary's operating expenses negative, a net loss
 * negative). The percent column holds a breakdown line's share of its section
 * or the profit margin, with 1 decimal, as shown: the page prints both
 * through `formatFixed`, which writes the cell, so a share or a margin just
 * below zero reads "0.0" in both.
 */
export const INCOME_STATEMENT_CSV_HEADER = [
	"Period",
	"Start Date",
	"End Date",
	"Currency",
	"Section",
	"Line Item",
	"Percent (%)",
	"Amount",
] as const;

/** The page renders every amount in US dollars (`formatCurrency`, `$`). */
const CURRENCY = "USD";

const PERIOD_LABELS: Record<string, string> = {
	monthly: "Monthly",
	quarterly: "Quarterly",
	yearly: "Yearly",
};

export interface IncomeStatementCsvInput {
	period: string;
	startDate: string;
	endDate: string;
	view: IncomeStatementView;
}

export function incomeStatementCsvFilename(
	startDate: string,
	endDate: string,
): string {
	return `tenantflow-income-statement-${csvIsoDate(startDate)}-to-${csvIsoDate(endDate)}.csv`;
}

export function buildIncomeStatementCsv({
	period,
	startDate,
	endDate,
	view,
}: IncomeStatementCsvInput): string {
	const context = [
		PERIOD_LABELS[period] ?? period,
		csvIsoDate(startDate),
		csvIsoDate(endDate),
		CURRENCY,
	];
	const row = (
		section: string,
		item: string,
		amount: number | null,
		percent?: number,
	): CsvCell[] => [
		...context,
		section,
		item,
		percent === undefined ? "" : csvNumber(percent, 1),
		amount === null ? "" : csvNumber(amount, 2),
	];

	const rows: CsvCell[][] = [
		row("Totals", "Total Revenue", view.totalRevenue),
		row("Totals", "Total Expenses", view.totalExpenses),
		row("Totals", "Net Income", view.netIncome),
		row("Totals", "Profit Margin", null, view.profitMargin),
		...view.revenueItems.map((i) =>
			row("Revenue Breakdown", i.label, i.amount, i.share),
		),
		row("Revenue Breakdown", "Total Revenue", view.totalRevenue),
		...view.expenseItems.map((i) =>
			row("Expense Breakdown", i.label, i.amount, i.share),
		),
		row("Expense Breakdown", "Total Expenses", view.totalExpenses),
		row("Net Income Summary", "Total Revenue", view.totalRevenue),
		row("Net Income Summary", "Total Operating Expenses", -view.totalExpenses),
		row("Net Income Summary", "Net Income", view.netIncome),
		// The note under the page's figures, one row per entry, no amount.
		...STATEMENT_BASIS_NOTE.map((entry) =>
			row(STATEMENT_BASIS_HEADING, entry, null),
		),
	];
	return toCsv(INCOME_STATEMENT_CSV_HEADER, rows);
}
