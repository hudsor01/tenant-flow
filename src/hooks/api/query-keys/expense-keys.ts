import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { omitUndefined } from "#lib/db-insert";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { ExpenseRecord } from "#types/core";
import type { TaxDocumentsData } from "#types/financial-statements";
import { mutationKeys } from "../mutation-keys";

export const financialTaxQueries = {
	taxDocuments: (year: number) =>
		queryOptions({
			queryKey: ["financials", "tax-documents", year] as const,
			queryFn: async (): Promise<TaxDocumentsData> => {
				const supabase = createClient();
				const user = await getCachedUser();
				const userId = user?.id;
				if (!userId) {
					return {
						period: {
							start_date: `${year}-01-01`,
							end_date: `${year}-12-31`,
							label: `Tax Year ${year}`,
						},
						taxYear: year,
						totals: { totalIncome: 0, totalDeductions: 0, netTaxableIncome: 0 },
						incomeBreakdown: {
							grossRentalIncome: 0,
							totalExpenses: 0,
							netOperatingIncome: 0,
							depreciation: 0,
							mortgageInterest: 0,
							taxableIncome: 0,
						},
						schedule: {
							scheduleE: {
								grossRentalIncome: 0,
								totalExpenses: 0,
								depreciation: 0,
								netIncome: 0,
							},
						},
						expenseCategories: [],
						propertyDepreciation: [],
					};
				}

				const [dashResult, expenseResult] = await Promise.all([
					supabase.rpc("get_dashboard_stats", { p_user_id: userId }),
					// Only the expense side is period-scoped; revenue remains annualized
					// MRR (get_dashboard_stats is point-in-time — no payment history).
					supabase.rpc("get_expense_summary", {
						p_user_id: userId,
						p_start_date: `${year}-01-01`,
						p_end_date: `${year}-12-31`,
					}),
				]);

				if (dashResult.error)
					handlePostgrestError(dashResult.error, "tax documents");
				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "tax documents expenses");

				// get_dashboard_stats RETURNS json (a bare object, supabase.ts
				// `Returns: Json`) — NOT a SETOF/array. Read it directly (the old
				// `data[0]` was always undefined → totalIncome collapsed to 0).
				const stats = dashResult.data as Record<string, unknown> | null;
				const revenue = stats?.revenue as Record<string, unknown> | undefined;
				const totalIncome = Number(revenue?.yearly ?? 0);
				const expenseSummary = expenseResult.data as Record<
					string,
					unknown
				> | null;
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0);
				const netIncome = totalIncome - totalExpenses;

				return {
					period: {
						start_date: `${year}-01-01`,
						end_date: `${year}-12-31`,
						label: `Tax Year ${year}`,
					},
					taxYear: year,
					totals: {
						totalIncome,
						totalDeductions: totalExpenses,
						netTaxableIncome: netIncome,
					},
					incomeBreakdown: {
						grossRentalIncome: totalIncome,
						totalExpenses,
						netOperatingIncome: netIncome,
						depreciation: 0,
						mortgageInterest: 0,
						taxableIncome: netIncome,
					},
					schedule: {
						scheduleE: {
							grossRentalIncome: totalIncome,
							totalExpenses,
							depreciation: 0,
							netIncome,
						},
					},
					expenseCategories: (
						(expenseSummary?.categories ?? []) as Array<Record<string, unknown>>
					).map((c) => ({
						category: String(c.category ?? ""),
						amount: Number(c.amount ?? 0),
						percentage: Number(c.percentage ?? 0),
						deductible: true,
					})),
					propertyDepreciation: [],
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
	detail: (id: string) => [...expenseKeys.all, "detail", id] as const,
	byProperty: (propertyId: string) =>
		[...expenseKeys.all, "property", propertyId] as const,
	byCategory: (category: string) =>
		[...expenseKeys.all, "category", category] as const,
	byDateRange: (start: string, end: string) =>
		[...expenseKeys.all, "dateRange", start, end] as const,
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
					throw new Error(
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

	byProperty: (propertyId: string, options?: { enabled?: boolean }) =>
		queryOptions({
			queryKey: expenseKeys.byProperty(propertyId),
			queryFn: async (): Promise<ExpenseRow[]> => {
				const supabase = createClient();
				// expenses → maintenance_requests → units → properties. There's no
				// property_id on maintenance_requests; the join goes through units.
				// Both queries are bounded by EXPENSES_LIST_DEFAULT_LIMIT so neither
				// side can produce an unbounded select.
				const { data: unitIds, error: uError } = await supabase
					.from("units")
					.select("id")
					.eq("property_id", propertyId)
					.limit(EXPENSES_LIST_DEFAULT_LIMIT);
				if (uError) handlePostgrestError(uError, "units");
				const unitIdList = (unitIds ?? []).map((u) => u.id);
				if (unitIdList.length === 0) return [];

				const { data: mrIds, error: mrError } = await supabase
					.from("maintenance_requests")
					.select("id")
					.in("unit_id", unitIdList)
					.limit(EXPENSES_LIST_DEFAULT_LIMIT);
				if (mrError) handlePostgrestError(mrError, "maintenance_requests");
				const ids = (mrIds ?? []).map((r) => r.id);
				if (ids.length === 0) return [];

				const { data, error } = await supabase
					.from("expenses")
					.select(EXPENSE_SELECT)
					.in("maintenance_request_id", ids)
					.neq("status", "inactive")
					.order("expense_date", { ascending: false })
					.limit(EXPENSES_LIST_DEFAULT_LIMIT);
				if (error) handlePostgrestError(error, "expenses by property");
				const rawRows: unknown[] = data ?? [];
				return rawRows.map((row) =>
					mapExpenseRow(row as Record<string, unknown>),
				);
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: (options?.enabled ?? true) && Boolean(propertyId),
		}),

	byDateRange: (
		startDate: string,
		endDate: string,
		options?: { enabled?: boolean },
	) =>
		queryOptions({
			queryKey: expenseKeys.byDateRange(startDate, endDate),
			queryFn: async (): Promise<ExpenseRow[]> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("expenses")
					.select(EXPENSE_SELECT)
					.neq("status", "inactive")
					.gte("expense_date", startDate)
					.lte("expense_date", endDate)
					.order("expense_date", { ascending: false })
					.limit(EXPENSES_LIST_DEFAULT_LIMIT);
				if (error) handlePostgrestError(error, "expenses by date range");
				const rawRows: unknown[] = data ?? [];
				return rawRows.map((row) =>
					mapExpenseRow(row as Record<string, unknown>),
				);
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled:
				(options?.enabled ?? true) && Boolean(startDate) && Boolean(endDate),
		}),
};

export interface CreateExpenseInput {
	amount: number;
	expense_date: string;
	maintenance_request_id: string;
	vendor_name?: string;
}

export const financialMutations = {
	createExpense: () =>
		mutationOptions({
			mutationKey: mutationKeys.expenses.create,
			mutationFn: async (input: CreateExpenseInput): Promise<ExpenseRow> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("expenses")
					.insert(
						omitUndefined({
							amount: input.amount,
							expense_date: input.expense_date,
							maintenance_request_id: input.maintenance_request_id,
							vendor_name: input.vendor_name,
						}),
					)
					.select(EXPENSE_SELECT)
					.single();
				if (error) handlePostgrestError(error, "create expense");
				const rawRow: unknown = data ?? {};
				return mapExpenseRow(rawRow as Record<string, unknown>);
			},
		}),

	deleteExpense: () =>
		mutationOptions({
			mutationKey: mutationKeys.expenses.delete,
			mutationFn: async (expenseId: string): Promise<void> => {
				// Soft-delete via status='inactive' to match the
				// properties/units/leases/tenants pattern. List queries filter
				// `.neq('status', 'inactive')` so the row disappears from views
				// without losing the audit/financial trail.
				const supabase = createClient();
				const { error } = await supabase
					.from("expenses")
					.update({ status: "inactive" })
					.eq("id", expenseId);
				if (error) handlePostgrestError(error, "delete expense");
			},
		}),
};
