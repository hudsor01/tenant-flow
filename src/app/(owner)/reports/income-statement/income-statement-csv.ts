import { type CsvCell, csvIsoDate, csvNumber, toCsv } from "#lib/reports/csv";
import type { IncomeStatementView } from "./income-statement-view";

/**
 * The income statement as CSV: one row per figure on the page, top to bottom
 * (the three stat tiles and the profit margin, the revenue and expense
 * breakdowns with their totals, the net income summary, the period
 * comparison when the page shows one). Every row repeats the period, the date
 * range and the currency, so a filtered or pasted row keeps its context.
 * Amounts are dollars with 2 decimals and no symbol, signed as the page shows
 * them (the summary's operating expenses negative, a net loss negative). The
 * percent column holds a breakdown line's share of its section, the profit
 * margin, or the change on the previous period, with 1 decimal, as shown.
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

/** The page renders every amount in US dollars (`formatCents`, `$`). */
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
	];
	if (view.grossProfit !== undefined) {
		rows.push(row("Net Income Summary", "Gross Profit", view.grossProfit));
	}
	if (view.operatingIncome !== undefined) {
		rows.push(
			row("Net Income Summary", "Operating Income", view.operatingIncome),
		);
	}
	rows.push(row("Net Income Summary", "Net Income", view.netIncome));
	if (view.previousPeriod) {
		rows.push(
			row(
				"Period Comparison",
				"Previous Period",
				view.previousPeriod.netIncome,
				view.previousPeriod.changePercent,
			),
		);
	}
	return toCsv(INCOME_STATEMENT_CSV_HEADER, rows);
}
