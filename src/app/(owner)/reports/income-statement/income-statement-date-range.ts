export interface IncomeStatementDateRange {
	start_date: string;
	end_date: string;
}

const pad2 = (value: number): string => value.toString().padStart(2, "0");

/**
 * Build the `{ start_date, end_date }` range fed to `get_expense_summary`
 * (`p_end_date date`). The end date must be a real calendar day — a hardcoded
 * `-31` produced invalid strings like `2026-06-31`/`2026-09-31` for Q2/Q3,
 * which Postgres rejects with SQLSTATE 22008 (COMP-03). `new Date(year, month, 0)`
 * yields the last day of the 1-based `month`, so it is correct for every period.
 */
export function buildIncomeStatementDateRange(
	period: string,
	year: string,
): IncomeStatementDateRange {
	const yearNum = parseInt(year, 10);

	if (period === "yearly") {
		return {
			start_date: `${yearNum}-01-01`,
			end_date: `${yearNum}-12-31`,
		};
	}

	if (period === "quarterly") {
		const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
		const quarterStart = (currentQuarter - 1) * 3 + 1;
		const quarterEnd = quarterStart + 2;
		const quarterEndDay = new Date(yearNum, quarterEnd, 0).getDate();
		return {
			start_date: `${yearNum}-${pad2(quarterStart)}-01`,
			end_date: `${yearNum}-${pad2(quarterEnd)}-${pad2(quarterEndDay)}`,
		};
	}

	const currentMonth = new Date().getMonth() + 1;
	const lastDay = new Date(yearNum, currentMonth, 0).getDate();
	return {
		start_date: `${yearNum}-${pad2(currentMonth)}-01`,
		end_date: `${yearNum}-${pad2(currentMonth)}-${pad2(lastDay)}`,
	};
}
