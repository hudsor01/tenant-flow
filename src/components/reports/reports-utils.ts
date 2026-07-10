import { format } from "date-fns";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatCurrency } from "#lib/utils/currency";

export const formatMoney = (value: number) =>
	formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

// Safe formatters for Recharts Tooltip (handles ValueType | undefined)
export const safeFormatMoney = (value: ValueType | undefined) =>
	formatMoney(Number(value ?? 0));

export const safeFormatPercent = (value: ValueType | undefined) =>
	formatPercent(Number(value ?? 0));

// Returns the first day of the month `monthsBack` months before `today`.
// Pin the day to 1 BEFORE shifting the month so setMonth can never overflow:
// e.g. on the 31st, `setMonth(month - 2)` on a shorter target month would spill
// into the following month (Date normalizes the out-of-range day forward).
export function startOfMonthsBack(today: Date, monthsBack: number): Date {
	const start = new Date(today);
	start.setDate(1);
	start.setMonth(today.getMonth() - monthsBack);
	return start;
}

export function getDefaultDateRange() {
	const today = new Date();
	const start = startOfMonthsBack(today, 2);

	return {
		start: format(start, "yyyy-MM-dd"),
		end: format(today, "yyyy-MM-dd"),
	};
}
