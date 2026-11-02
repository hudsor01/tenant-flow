/**
 * get_property_performance_analytics at the RPC boundary (20261102163709).
 *
 * The body before that migration returns `0::numeric AS total_revenue` and
 * echoes p_timeframe as `timeframe`; the new body returns each property's rent
 * received and states the window it computed, as 'YYYY-MM-DD/YYYY-MM-DD'. No
 * input the new body accepts is in that form (a range is asked for with
 * '..'), so a row whose timeframe is not a stated window, or not the window
 * asked for, is the old body's: its revenue is no figure, and these mappers say
 * so instead of passing its 0 on as money.
 */

import type { PostgrestError } from "@supabase/supabase-js";
import { parseStatedWindow } from "#lib/stated-window";
import { createClient } from "#lib/supabase/client";
import type { DateWindow } from "#types/analytics";
import type { Database } from "#types/supabase";

type PerformanceRow =
	Database["public"]["Functions"]["get_property_performance_analytics"]["Returns"][number];

/** PostgREST's max-rows (CLAUDE.md, Data access): one request reads at most this. */
const PAGE_SIZE = 1000;

/**
 * Every row get_property_performance_analytics returns for `args`, page by
 * page: the function lists every property (p_limit NULL, 20261102163709), but
 * PostgREST returns at most max-rows of it a request, so a caller that shows a
 * total or a whole list (the year-end table, the property export, the
 * analytics page) reads until a page comes back short, ordered by name and id
 * so no row is read twice or skipped. Its first error ends the read.
 */
export async function fetchEveryPropertyPerformanceRow(args: {
	p_user_id: string;
	p_timeframe: string;
}): Promise<
	| { data: PerformanceRow[]; error: null }
	| { data: null; error: PostgrestError }
> {
	const supabase = createClient();
	const rows: PerformanceRow[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await supabase
			.rpc("get_property_performance_analytics", args)
			.order("property_name")
			.order("property_id")
			.range(from, from + PAGE_SIZE - 1);
		if (error) return { data: null, error };
		const page = data ?? [];
		rows.push(...page);
		if (page.length < PAGE_SIZE) return { data: rows, error: null };
	}
}

/** p_timeframe for an inclusive calendar range, both days included. */
export function propertyPerformanceRange(
	start_date: string,
	end_date: string,
): string {
	return `${start_date}..${end_date}`;
}

/** p_timeframe for a calendar tax year. */
export function taxYearRange(year: number): string {
	return propertyPerformanceRange(`${year}-01-01`, `${year}-12-31`);
}

/** One property's figures over the window, in dollars. */
export interface PropertyRentReceived {
	readonly propertyId: string;
	readonly propertyName: string;
	readonly occupancyRate: number;
	readonly rentReceived: number;
	readonly expenses: number;
	readonly netIncome: number;
}

/**
 * The rows, when every one states the same window (the one asked for, when a
 * range was asked for). `window` is null only when there are no rows to state
 * it. `rent-received-unavailable` carries what the old body still gets right,
 * occupancy, and nothing in dollars: its expenses were over a different window
 * than any range asked for.
 */
export type PropertyPerformanceResult =
	| {
			readonly status: "ready";
			readonly window: DateWindow | null;
			readonly properties: readonly PropertyRentReceived[];
	  }
	| {
			readonly status: "rent-received-unavailable";
			readonly occupancy: readonly Pick<
				PropertyRentReceived,
				"propertyId" | "propertyName" | "occupancyRate"
			>[];
	  };

export function mapPropertyPerformance(
	data: readonly PerformanceRow[] | null,
	requested?: DateWindow,
): PropertyPerformanceResult {
	const rows = data ?? [];
	if (rows.length === 0) {
		return { status: "ready", window: requested ?? null, properties: [] };
	}
	const stated = rows.map((row) => parseStatedWindow(row.timeframe));
	const first = stated[0];
	const consistent =
		first !== null &&
		first !== undefined &&
		stated.every(
			(window) =>
				window !== null &&
				window.start_date === first.start_date &&
				window.end_date === first.end_date,
		) &&
		(requested === undefined ||
			(first.start_date === requested.start_date &&
				first.end_date === requested.end_date));
	if (!consistent || first === null || first === undefined) {
		return {
			status: "rent-received-unavailable",
			occupancy: rows.map((row) => ({
				propertyId: row.property_id,
				propertyName: row.property_name,
				occupancyRate: Number(row.occupancy_rate),
			})),
		};
	}
	return {
		status: "ready",
		window: first,
		properties: rows.map((row) => ({
			propertyId: row.property_id,
			propertyName: row.property_name,
			occupancyRate: Number(row.occupancy_rate),
			rentReceived: Number(row.total_revenue),
			expenses: Number(row.total_expenses),
			netIncome: Number(row.net_income),
		})),
	};
}
