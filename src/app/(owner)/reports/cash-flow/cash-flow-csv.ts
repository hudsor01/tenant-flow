import { type CsvCell, csvIsoDate, csvNumber, toCsv } from "#lib/reports/csv";
import type { CashFlowView } from "./cash-flow-view";

/**
 * The cash-flow report as CSV: one row per figure on the page, top to bottom
 * (balance strip, the three stat tiles, the inflow and outflow breakdowns with
 * their totals, cash flow by activity). Every row repeats the period, the date
 * range and the currency, so a filtered or pasted row keeps its context.
 * Amounts are dollars with 2 decimals and no symbol (outflow lines positive,
 * as the page lists them; a net figure keeps its sign); a breakdown line's
 * share of its section is a percentage with 1 decimal, as shown.
 */
export const CASH_FLOW_CSV_HEADER = [
	"Period",
	"Start Date",
	"End Date",
	"Currency",
	"Section",
	"Line Item",
	"Share (%)",
	"Amount",
] as const;

/** The page renders every amount in US dollars (`formatCents`, `$`). */
const CURRENCY = "USD";

const PERIOD_LABELS: Record<string, string> = {
	monthly: "Monthly",
	quarterly: "Quarterly",
	yearly: "Yearly",
};

export interface CashFlowCsvInput {
	period: string;
	startDate: string;
	endDate: string;
	view: CashFlowView;
}

export function cashFlowCsvFilename(
	startDate: string,
	endDate: string,
): string {
	return `tenantflow-cash-flow-${csvIsoDate(startDate)}-to-${csvIsoDate(endDate)}.csv`;
}

export function buildCashFlowCsv({
	period,
	startDate,
	endDate,
	view,
}: CashFlowCsvInput): string {
	const context = [
		PERIOD_LABELS[period] ?? period,
		csvIsoDate(startDate),
		csvIsoDate(endDate),
		CURRENCY,
	];
	const money = (value: number) => csvNumber(value, 2);
	const line = (
		section: string,
		item: string,
		amount: number,
		share?: number,
	): CsvCell[] => [
		...context,
		section,
		item,
		share === undefined ? "" : csvNumber(share, 1),
		money(amount),
	];

	const rows: CsvCell[][] = [
		line("Balance Summary", "Opening Balance", view.openingBalance),
		line("Balance Summary", "Net Cash Flow", view.netCashFlow),
		line("Balance Summary", "Closing Balance", view.closingBalance),
		line("Totals", "Total Inflows", view.totalInflows),
		line("Totals", "Total Outflows", view.totalOutflows),
		line("Totals", "Net Cash Flow", view.netCashFlow),
		...view.inflowItems.map((i) =>
			line("Cash Inflows", i.category, i.amount, i.percentage),
		),
		line("Cash Inflows", "Total Inflows", view.totalInflows),
		...view.outflowItems.map((i) =>
			line("Cash Outflows", i.category, i.amount, i.percentage),
		),
		line("Cash Outflows", "Total Outflows", view.totalOutflows),
		line(
			"Cash Flow by Activity",
			"Operating Activities",
			view.netOperatingCash,
		),
		line(
			"Cash Flow by Activity",
			"Investing Activities",
			view.netInvestingCash,
		),
		line(
			"Cash Flow by Activity",
			"Financing Activities",
			view.netFinancingCash,
		),
	];
	return toCsv(CASH_FLOW_CSV_HEADER, rows);
}
