/**
 * Expense Hooks — the expense list and tax documents.
 * Financial statement hooks remain in use-financials.ts.
 *
 * Query keys and queryOptions factories live in query-keys/expense-keys.ts.
 */

import { useQuery } from "@tanstack/react-query";
import { expenseQueries, financialTaxQueries } from "./query-keys/expense-keys";

/**
 * Returns the active (non-soft-deleted) expense list. Bounded by
 * EXPENSES_LIST_DEFAULT_LIMIT inside `expenseQueries.list` so the SELECT is
 * never unbounded. Callers that need server-side pagination should call
 * `expenseQueries.list({ limit, offset })` directly via useQuery — there is
 * no separate paginated hook because no caller currently needs one (YAGNI).
 */
export function useExpenses(options?: { enabled?: boolean }) {
	return useQuery({
		...expenseQueries.list(options),
		select: (page) => page.data,
	});
}

export function useTaxDocuments(taxYear?: number) {
	const year = taxYear ?? new Date().getFullYear();
	return useQuery(financialTaxQueries.taxDocuments(year));
}
