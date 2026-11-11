/**
 * get_property_performance_analytics at the RPC boundary (20261110123116).
 *
 * The body before that migration returns `0::numeric AS total_revenue` and
 * echoes p_timeframe as `timeframe`; the new body returns each property's rent
 * received and states the window it computed, as 'YYYY-MM-DD/YYYY-MM-DD'. No
 * input the new body accepts is in that form (a range is asked for with
 * '..'), so a row whose timeframe is not a stated window, or not the window
 * asked for, is the old body's: its revenue is no figure, and these mappers say
 * so instead of passing its 0 on as money.
 *
 * For an explicit range the function also lists a property the owner has
 * deleted since, when it received rent or spent in the range, so a tax year's
 * table ties to its summary; its row does not say so (the RETURNS TABLE is
 * unchanged), so a caller that lists a range's rows reads the owner's deleted
 * property ids (fetchDeletedPropertyIds) and the mapper names each such
 * property through the report label map (propertyReportName).
 */

import type { PostgrestError } from "@supabase/supabase-js";
import { parseStatedWindow } from "#lib/stated-window";
import { createClient } from "#lib/supabase/client";
import type { DateWindow } from "#types/analytics";
import type { Database } from "#types/supabase";
import { propertyReportName } from "../../../../supabase/functions/_shared/tax-year-reports";

type PerformanceRow =
	Database["public"]["Functions"]["get_property_performance_analytics"]["Returns"][number];

/** PostgREST's max-rows (CLAUDE.md, Data access): one request reads at most this. */
const PAGE_SIZE = 1000;

/**
 * Every row get_property_performance_analytics returns for `args`, page by
 * page: the function lists every property (p_limit NULL, 20261110123116), but
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

/**
 * The owner's deleted (status 'inactive') property ids, page by page, under
 * RLS and owner-scoped: the properties a range's rows may hold that the page
 * must name as deleted. Its first error ends the read.
 */
export async function fetchDeletedPropertyIds(
	ownerId: string,
): Promise<
	| { data: ReadonlySet<string>; error: null }
	| { data: null; error: PostgrestError }
> {
	const supabase = createClient();
	const ids = new Set<string>();
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await supabase
			.from("properties")
			.select("id")
			.eq("owner_user_id", ownerId)
			.eq("status", "inactive")
			.order("id")
			.range(from, from + PAGE_SIZE - 1);
		if (error) return { data: null, error };
		const page = data ?? [];
		for (const row of page) ids.add(row.id);
		if (page.length < PAGE_SIZE) return { data: ids, error: null };
	}
}

/**
 * A unit the property performance page counts and lists: not soft-deleted
 * (status 'inactive'), on a property that is not, the counted-units rule the
 * occupancy figures use (20261110123118, 20261110123126).
 */
export interface CountedUnit {
	readonly property_id: string;
	readonly unit_number: string | null;
	readonly status: string;
	readonly bedrooms: number | null;
	readonly bathrooms: number | null;
	readonly rent_amount: number;
}

/**
 * The owner's counted units, page by page under RLS and owner-scoped, most
 * recently updated first (then by id, so no row is read twice or skipped). Its
 * first error ends the read.
 */
export async function fetchCountedUnits(
	ownerId: string,
): Promise<
	{ data: CountedUnit[]; error: null } | { data: null; error: PostgrestError }
> {
	const supabase = createClient();
	const units: CountedUnit[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await supabase
			.from("units")
			.select(
				"property_id, unit_number, status, bedrooms, bathrooms, rent_amount, properties!inner(status)",
			)
			.eq("owner_user_id", ownerId)
			.neq("status", "inactive")
			.neq("properties.status", "inactive")
			.order("updated_at", { ascending: false })
			.order("id")
			.range(from, from + PAGE_SIZE - 1);
		if (error) return { data: null, error };
		const page = data ?? [];
		for (const row of page) {
			units.push({
				property_id: row.property_id,
				unit_number: row.unit_number,
				status: row.status,
				bedrooms: row.bedrooms,
				bathrooms: row.bathrooms,
				rent_amount: row.rent_amount,
			});
		}
		if (page.length < PAGE_SIZE) return { data: units, error: null };
	}
}

/** Each property's counted units: all of them, and the occupied ones. */
export interface PropertyUnitCounts {
	readonly total: number;
	readonly occupied: number;
}

export function unitCountsByProperty(
	units: readonly CountedUnit[],
): ReadonlyMap<string, PropertyUnitCounts> {
	const counts = new Map<string, PropertyUnitCounts>();
	for (const unit of units) {
		const at = counts.get(unit.property_id) ?? { total: 0, occupied: 0 };
		counts.set(unit.property_id, {
			total: at.total + 1,
			occupied: at.occupied + (unit.status === "occupied" ? 1 : 0),
		});
	}
	return counts;
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
	/** As a report prints it: a deleted property's says so. */
	readonly propertyName: string;
	/** The owner has deleted the property since (status 'inactive'). */
	readonly deleted: boolean;
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

/**
 * `deleted` names the owner's deleted property ids, for a range's rows
 * (fetchDeletedPropertyIds); a trailing window lists none of them.
 */
export function mapPropertyPerformance(
	data: readonly PerformanceRow[] | null,
	requested?: DateWindow,
	deleted: ReadonlySet<string> = new Set(),
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
			propertyName: propertyReportName(
				row.property_name,
				deleted.has(row.property_id) ? "inactive" : "active",
			),
			deleted: deleted.has(row.property_id),
			occupancyRate: Number(row.occupancy_rate),
			rentReceived: Number(row.total_revenue),
			expenses: Number(row.total_expenses),
			netIncome: Number(row.net_income),
		})),
	};
}
