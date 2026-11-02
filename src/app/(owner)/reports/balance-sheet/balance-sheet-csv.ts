import { type CsvCell, csvIsoDate, csvNumber, toCsv } from "#lib/reports/csv";
import type { BalanceSheetGroup, BalanceSheetView } from "./balance-sheet-view";

/**
 * The balance sheet as CSV: one row per figure on the page, top to bottom (the
 * three stat tiles, the balance check, the Assets and Liabilities cards with
 * every group's lines and subtotal, the Equity card). A balance sheet is a
 * position on one day, so every row repeats that as-of date and the currency
 * rather than a range. Amounts are dollars with 2 decimals and no symbol,
 * signed as the page shows them (accumulated depreciation negative). The
 * balance check row names its outcome and carries no amount.
 */
export const BALANCE_SHEET_CSV_HEADER = [
	"As Of Date",
	"Currency",
	"Section",
	"Group",
	"Line Item",
	"Amount",
] as const;

/** The page renders every amount in US dollars (`formatCurrency`, `$`). */
const CURRENCY = "USD";

export function balanceSheetCsvFilename(asOfDate: string): string {
	return `tenantflow-balance-sheet-${csvIsoDate(asOfDate)}.csv`;
}

export interface BalanceSheetCsvInput {
	asOfDate: string;
	view: BalanceSheetView;
}

export function buildBalanceSheetCsv({
	asOfDate,
	view,
}: BalanceSheetCsvInput): string {
	const context = [csvIsoDate(asOfDate), CURRENCY];
	const row = (
		section: string,
		group: string,
		item: string,
		amount: number | null,
	): CsvCell[] => [
		...context,
		section,
		group,
		item,
		amount === null ? "" : csvNumber(amount, 2),
	];
	const groupRows = (section: string, groups: BalanceSheetGroup[]) =>
		groups.flatMap((g) => [
			...g.items.map((i) => row(section, g.label, i.name, i.amount)),
			row(section, g.label, "Subtotal", g.subtotal),
		]);

	const rows: CsvCell[][] = [
		row("Totals", "", "Total Assets", view.totalAssets),
		row("Totals", "", "Total Liabilities", view.totalLiabilities),
		row("Totals", "", "Total Equity", view.totalEquity),
		row("Balance Check", "", view.isBalanced ? "Balanced" : "Unbalanced", null),
		...groupRows("Assets", view.assetGroups),
		row("Assets", "", "Total Assets", view.totalAssets),
		...groupRows("Liabilities", view.liabilityGroups),
		row("Liabilities", "", "Total Liabilities", view.totalLiabilities),
		...view.equityItems.map((i) => row("Equity", "", i.name, i.amount)),
		row("Equity", "", "Total Equity", view.totalEquity),
	];
	return toCsv(BALANCE_SHEET_CSV_HEADER, rows);
}
