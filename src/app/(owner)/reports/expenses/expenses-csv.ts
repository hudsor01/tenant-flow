import type { ExpenseRow } from "#hooks/api/query-keys/expense-keys";
import { csvNumber, toCsv } from "#lib/reports/csv";

export const EXPENSES_CSV_HEADER = [
	"Date",
	"Description",
	"Vendor",
	"Property",
	"Amount",
] as const;

// Client-side CSV of the rows the user currently sees. No edge function: the
// export-report function reads query params only and ignores the request body,
// so it can never export filtered expenses (COMP-07). `amount` is dollars
// (numeric(10,2)): written with 2 decimals, never divided by 100.
// `expense_date` is a date-only string, written raw (no `new Date()`
// round-trip, which would reintroduce the UTC day-shift of COMP-05). Text
// cells go through the shared writer's formula neutralization.
export function buildExpensesCsv(rows: ExpenseRow[]): string {
	return toCsv(
		EXPENSES_CSV_HEADER,
		rows.map((expense) => [
			expense.expense_date,
			expense.description ?? "",
			expense.vendor_name ?? "",
			expense.property_name ?? "",
			csvNumber(expense.amount, 2),
		]),
	);
}
