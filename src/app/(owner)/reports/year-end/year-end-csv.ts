import { type CsvCell, csvNumber, toCsv } from "#lib/reports/csv";
import type { YearEndSummary } from "#types/reports";

/**
 * The year-end CSV, written through `#lib/reports/csv` so a property or vendor
 * name that starts like a formula is neutralized and every amount is a plain
 * 2-decimal dollar number. Each section's figures sit in
 * their own columns under one fixed header (the old writer took its header
 * from the first row, so the By Property income, expense and net columns were
 * dropped).
 */
export const YEAR_END_CSV_HEADER = [
	"Section",
	"Item",
	"Value",
	"Rent Received",
	"Expenses",
	"Net",
] as const;

const money = (value: number) => csvNumber(value, 2);
const whole = (value: number) => csvNumber(value, 0);

export function buildYearEndCsv(summary: YearEndSummary): string {
	const rows: CsvCell[][] = [
		["Overview", "Tax Year", whole(summary.year), "", "", ""],
		["Overview", "Rent Received", money(summary.rentReceived), "", "", ""],
		[
			"Overview",
			"Operating Expenses",
			money(summary.operatingExpenses),
			"",
			"",
			"",
		],
		["Overview", "Net Income", money(summary.netIncome), "", "", ""],
		...summary.byProperty.map((p): CsvCell[] => [
			"By Property",
			p.propertyName,
			"",
			money(p.rentReceived),
			money(p.expenses),
			money(p.netIncome),
		]),
		...summary.expenseByCategory.map((c): CsvCell[] => [
			"Expenses by Vendor",
			c.category,
			money(c.amount),
			"",
			"",
			"",
		]),
	];
	return toCsv(YEAR_END_CSV_HEADER, rows);
}
