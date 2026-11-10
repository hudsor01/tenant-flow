/**
 * The days a figure covers, as an RPC states them: an ISO 8601 date interval,
 * 'YYYY-MM-DD/YYYY-MM-DD', both days included.
 *
 * get_property_performance_analytics states its window in `timeframe`
 * (20261102163709); get_dashboard_stats and get_dashboard_data_v2 state the
 * two days their trends compare (20261102184501); get_expense_summary states
 * the prior period its year over year compares with (20261102184502). The
 * bodies before each of those never return a value in this form, so a value
 * that parses is how a caller knows the figure beside it was computed.
 */
import type { DateWindow } from "#types/analytics";

const STATED_WINDOW = /^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/;

/** The window a value states, or null for any other value. */
export function parseStatedWindow(value: unknown): DateWindow | null {
	if (typeof value !== "string") return null;
	const match = STATED_WINDOW.exec(value);
	const start_date = match?.[1];
	const end_date = match?.[2];
	return start_date && end_date ? { start_date, end_date } : null;
}

/** The days from a window's first day to its last (0 for a one-day window). */
export function windowDays(window: DateWindow): number {
	return Math.round(
		(Date.parse(`${window.end_date}T00:00:00Z`) -
			Date.parse(`${window.start_date}T00:00:00Z`)) /
			86_400_000,
	);
}
