import { formatLocalYmd } from "#lib/formatters/date";
import type { DateWindow } from "#types/analytics";

/**
 * Build the income statement's period (financialQueries.incomeStatement, which
 * passes its days to get_billing_insights and get_expense_summary as `date`s):
 * the first and last day of a run of months, as local YYYY-MM-DD, the shared
 * DateWindow. The end date must be a real calendar day; a hardcoded `-31`
 * produced invalid strings like `2026-06-31`/`2026-09-31` for Q2/Q3, which
 * Postgres rejects with SQLSTATE 22008 (COMP-03). Day 0 of the month after the
 * run is its last day, so it is correct for every period.
 */
export function buildIncomeStatementDateRange(
	period: string,
	year: string,
): DateWindow {
	const yearNum = parseInt(year, 10);
	const range = (startMonthIndex: number, months: number) => ({
		start_date: formatLocalYmd(new Date(yearNum, startMonthIndex, 1)),
		end_date: formatLocalYmd(new Date(yearNum, startMonthIndex + months, 0)),
	});

	if (period === "yearly") return range(0, 12);
	if (period === "quarterly") {
		return range(Math.floor(new Date().getMonth() / 3) * 3, 3);
	}
	return range(new Date().getMonth(), 1);
}
