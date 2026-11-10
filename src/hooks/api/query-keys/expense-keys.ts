import { queryOptions } from "@tanstack/react-query";
import { DiagnosticError } from "#lib/diagnostic-error";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { ExpenseRecord } from "#types/core";
import type { TaxDocumentsResult } from "#types/financial-statements";
import { expenseVendorLabel } from "../../../../supabase/functions/_shared/tax-year-reports";
import { fetchRentReceivedInYear } from "./financial-keys";

export const financialTaxQueries = {
	taxDocuments: (year: number) =>
		queryOptions({
			queryKey: ["financials", "tax-documents", year] as const,
			queryFn: async (): Promise<TaxDocumentsResult> => {
				const supabase = createClient();
				const user = await getCachedUser();
				const userId = user?.id;
				if (!userId) throw new Error("Not authenticated");

				// A cash-basis tax year: rent received from the rent ledger, less
				// the year's expenses. Before part L the income was today's
				// scheduled rent times twelve (get_dashboard_stats), for any year.
				const [rentReceived, expenseResult] = await Promise.all([
					fetchRentReceivedInYear(userId, year, "tax documents"),
					supabase.rpc("get_expense_summary", {
						p_user_id: userId,
						p_start_date: `${year}-01-01`,
						p_end_date: `${year}-12-31`,
					}),
				]);

				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "tax documents expenses");
				if (rentReceived === null) {
					return { status: "ledger-unavailable" };
				}

				const totalIncome = rentReceived;
				const expenseSummary = expenseResult.data as Record<
					string,
					unknown
				> | null;
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0);
				const netIncome = Math.round((totalIncome - totalExpenses) * 100) / 100;

				return {
					status: "ready",
					documents: {
						period: {
							start_date: `${year}-01-01`,
							end_date: `${year}-12-31`,
							label: `Tax Year ${year}`,
						},
						taxYear: year,
						totals: { totalIncome, totalExpenses, netIncome },
						// Each vendor's expenses for the year, as entered: TenantFlow
						// does not decide which are deductible (DEDUCTIBILITY_NOTE).
						expenseCategories: (
							(expenseSummary?.categories ?? []) as Array<
								Record<string, unknown>
							>
						).map((c) => ({
							category: expenseVendorLabel(c.category),
							amount: Number(c.amount ?? 0),
							percentage: Number(c.percentage ?? 0),
						})),
					},
				};
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),
};

// Separate root from financialKeys to preserve cache structure across consumers.
export const expenseKeys = {
	all: ["expenses"] as const,
	list: () => [...expenseKeys.all, "list"] as const,
};

// Real columns only (`description` was missing → the table showed "Expense" on
// every row) plus the property linkage via the expenses → maintenance_requests
// → units → properties join. Typed `string` so supabase-js returns a generic
// row shape validated at the mapExpenseRow boundary (the nested-embed pattern
// used by maintenance-keys.ts).
const EXPENSE_SELECT: string =
	"id, amount, description, expense_date, vendor_name, maintenance_request_id, status, created_at, maintenance_requests(units(properties(name)))";

/**
 * Select-scoped view of an expenses row. Reuses the canonical
 * `ExpenseRecord = Tables<"expenses">` (no duplicate type, Rule #3) and adds the
 * derived `property_name` from the maintenance_requests→units→properties join.
 * `expenses` has NO `category`/`property_name`/`property_id` columns, so the
 * schema-derived Pick makes reading a fabricated field a compile error.
 */
export type ExpenseRow = Pick<
	ExpenseRecord,
	| "id"
	| "amount"
	| "description"
	| "expense_date"
	| "vendor_name"
	| "maintenance_request_id"
	| "status"
	| "created_at"
> & { property_name: string | null };

/**
 * Extract the first embedded record from a PostgREST to-one embed, which
 * resolves to either an object or a single-element array depending on how the
 * relationship is detected. Returns null for anything else.
 */
function firstEmbedded(value: unknown): Record<string, unknown> | null {
	if (Array.isArray(value)) {
		const first = value[0];
		return first && typeof first === "object"
			? (first as Record<string, unknown>)
			: null;
	}
	if (value && typeof value === "object") {
		return value as Record<string, unknown>;
	}
	return null;
}

/**
 * Typed boundary mapper (CLAUDE.md "typed mapper at every boundary"): a raw
 * PostgREST expenses row plus its nested maintenance_requests→units→properties
 * embed → `ExpenseRow`. Derives `property_name` from the join. Never
 * `as unknown as`.
 */
function mapExpenseRow(raw: Record<string, unknown>): ExpenseRow {
	const maintenanceRequest = firstEmbedded(raw.maintenance_requests);
	const unit = firstEmbedded(maintenanceRequest?.units);
	const property = firstEmbedded(unit?.properties);
	const propertyName =
		property && typeof property.name === "string" ? property.name : null;
	return {
		id: String(raw.id ?? ""),
		amount: Number(raw.amount ?? 0),
		description: typeof raw.description === "string" ? raw.description : null,
		expense_date: String(raw.expense_date ?? ""),
		vendor_name: typeof raw.vendor_name === "string" ? raw.vendor_name : null,
		maintenance_request_id: String(raw.maintenance_request_id ?? ""),
		status: String(raw.status ?? ""),
		created_at: typeof raw.created_at === "string" ? raw.created_at : null,
		property_name: propertyName,
	};
}

export interface PaginatedExpenses {
	data: ExpenseRow[];
	total: number;
}

/**
 * Default ceiling applied when a caller doesn't specify `limit`. Matches the
 * PostgREST `max-rows` ceiling we run with project-wide and satisfies CLAUDE.md's
 * "all list queries MUST have .limit() or .range()" rule even on the legacy
 * useExpenses() path. Paginated callers pass an explicit limit + offset and
 * skip this fallback.
 */
const EXPENSES_LIST_DEFAULT_LIMIT = 1000;

export const expenseQueries = {
	list: (options?: { enabled?: boolean; limit?: number; offset?: number }) =>
		queryOptions({
			queryKey: [
				...expenseKeys.list(),
				{ limit: options?.limit ?? null, offset: options?.offset ?? null },
			] as const,
			queryFn: async (): Promise<PaginatedExpenses> => {
				const supabase = createClient();

				// Always request the exact count so `total` is the true row count on
				// every path (CLAUDE.md: use `count`, never `data.length`). This is
				// the same unconditional COUNT(*) every other list factory pays.
				let q = supabase
					.from("expenses")
					.select(EXPENSE_SELECT, { count: "exact" })
					.neq("status", "inactive")
					.order("expense_date", { ascending: false });

				if (options?.limit !== undefined) {
					if (options?.offset !== undefined) {
						q = q.range(options.offset, options.offset + options.limit - 1);
					} else {
						q = q.limit(options.limit);
					}
				} else if (options?.offset !== undefined) {
					// CLAUDE.md: list queries MUST be bounded. Refuse offset-without-limit
					// rather than silently returning the full table under a paginated key.
					throw new DiagnosticError(
						"expenseQueries.list: offset requires limit (unbounded list queries are not allowed)",
					);
				} else {
					// No caller-supplied bound: apply the default ceiling so the SELECT
					// is never unbounded, even on the legacy non-paginated path.
					q = q.limit(EXPENSES_LIST_DEFAULT_LIMIT);
				}

				const { data, error, count } = await q;
				if (error) handlePostgrestError(error, "expenses");
				const rawRows: unknown[] = data ?? [];
				return {
					data: rawRows.map((row) =>
						mapExpenseRow(row as Record<string, unknown>),
					),
					total: count ?? 0,
				};
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: options?.enabled ?? true,
		}),
};
