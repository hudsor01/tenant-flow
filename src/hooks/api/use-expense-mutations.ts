/**
 * Expense Hooks — expense queries, CRUD mutations, and tax documents.
 * Financial overview/statement hooks remain in use-financials.ts.
 *
 * Query keys and queryOptions factories live in query-keys/financial-keys.ts.
 * This file re-exports keys for backward compatibility and provides thin hooks.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";
import {
	expenseKeys,
	expenseQueries,
	financialMutations,
	financialTaxQueries,
} from "./query-keys/expense-keys";
import { financialKeys } from "./query-keys/financial-keys";
import { maintenanceQueries } from "./query-keys/maintenance-keys";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";

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

export function useExpensesByProperty(
	propertyId: string,
	options?: { enabled?: boolean },
) {
	return useQuery(expenseQueries.byProperty(propertyId, options));
}

export function useExpensesByDateRange(
	startDate: string,
	endDate: string,
	options?: { enabled?: boolean },
) {
	return useQuery(expenseQueries.byDateRange(startDate, endDate, options));
}

export function useCreateExpenseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...financialMutations.createExpense(),
		...createMutationCallbacks(queryClient, {
			// Cross-domain fanout: every expense aggregation RPC lives under
			// financialKeys.all (['financials']) — including tax docs which are
			// keyed ['financials', 'tax-documents', year], so this prefix alone
			// covers them. ownerDashboardKeys.all is included per the
			// CLAUDE.md convention "mutations invalidate related query keys +
			// ownerDashboardKeys.all" — covers any future dashboard tile that
			// surfaces expense numbers (today's get_dashboard_stats does not,
			// but the convention prevents drift).
			invalidate: [
				expenseKeys.all,
				financialKeys.all,
				// Maintenance-scoped expenses list on the request detail page
				// (maintenanceQueries.expenses(id)) sits under this prefix.
				maintenanceQueries.all(),
				ownerDashboardKeys.all,
			],
			errorContext: "Create expense",
		}),
	});
}

export function useDeleteExpenseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...financialMutations.deleteExpense(),
		...createMutationCallbacks(queryClient, {
			// Same cross-domain fanout as create — see useCreateExpenseMutation.
			invalidate: [
				expenseKeys.all,
				financialKeys.all,
				maintenanceQueries.all(),
				ownerDashboardKeys.all,
			],
			errorContext: "Delete expense",
		}),
	});
}

export function useTaxDocuments(taxYear?: number) {
	const year = taxYear ?? new Date().getFullYear();
	return useQuery(financialTaxQueries.taxDocuments(year));
}
