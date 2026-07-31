import type { ExpenseRow } from "#hooks/api/query-keys/expense-keys";

// Quote a CSV cell when it contains a delimiter, quote, or newline, doubling
// any embedded quotes (mirrors the export-report edge function's rowsToCsv).
export function escapeCsvCell(value: string): string {
	return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Client-side CSV of the rows the user currently sees. No edge function: the
// export-report function reads query params only and ignores the request body,
// so it can never export filtered expenses (COMP-07). `amount` is INTEGER
// dollars — emit it verbatim, never divide by 100. `expense_date` is a
// date-only string — emit it raw (no `new Date()` round-trip, which would
// reintroduce the UTC day-shift of COMP-05).
export function buildExpensesCsv(rows: ExpenseRow[]): string {
	const headers = ["Date", "Description", "Vendor", "Property", "Amount"];
	const lines = rows.map((expense) =>
		[
			expense.expense_date,
			expense.description ?? "",
			expense.vendor_name ?? "",
			expense.property_name ?? "",
			String(expense.amount),
		]
			.map((cell) => escapeCsvCell(cell))
			.join(","),
	);
	return [headers.join(","), ...lines].join("\n");
}
