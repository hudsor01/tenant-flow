import { type CsvCell, csvNumber, toCsv } from "#lib/reports/csv";
import type { Year1099Summary, YearEndSummary } from "#types/reports";

/**
 * Year-end and 1099-NEC CSVs, written through `#lib/reports/csv` so a property,
 * category or vendor name that starts like a formula is neutralized and every
 * amount is a plain 2-decimal dollar number. Each section's figures sit in
 * their own columns under one fixed header (the old writer took its header
 * from the first row, so the By Property income, expense and net columns were
 * dropped).
 */
export const YEAR_END_CSV_HEADER = [
	"Section",
	"Item",
	"Value",
	"Income",
	"Expenses",
	"Net",
] as const;

export const REPORT_1099_CSV_HEADER = [
	"vendor_name",
	"total_paid",
	"job_count",
	"year",
	"threshold",
	"requires_1099",
] as const;

const money = (value: number) => csvNumber(value, 2);
const whole = (value: number) => csvNumber(value, 0);

export function buildYearEndCsv(summary: YearEndSummary): string {
	const rows: CsvCell[][] = [
		["Overview", "Tax Year", whole(summary.year), "", "", ""],
		[
			"Overview",
			"Gross Rental Income",
			money(summary.grossRentalIncome),
			"",
			"",
			"",
		],
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
			money(p.income),
			money(p.expenses),
			money(p.netIncome),
		]),
		...summary.expenseByCategory.map((c): CsvCell[] => [
			"Expense Categories",
			c.category,
			money(c.amount),
			"",
			"",
			"",
		]),
	];
	return toCsv(YEAR_END_CSV_HEADER, rows);
}

export function build1099Csv(summary: Year1099Summary, year: number): string {
	if (summary.recipients.length === 0) {
		return toCsv(
			["message"],
			[
				[
					`No vendors met the $${summary.threshold} 1099-NEC threshold for ${year}`,
				],
			],
		);
	}
	return toCsv(
		REPORT_1099_CSV_HEADER,
		summary.recipients.map((r): CsvCell[] => [
			r.vendorName,
			money(r.totalPaid),
			whole(r.jobCount),
			whole(year),
			money(summary.threshold),
			"Yes",
		]),
	);
}
