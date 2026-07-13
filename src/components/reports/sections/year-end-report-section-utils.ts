export interface ExpenseCategoryTotal {
	category: string;
	amount: number;
}

/**
 * Return expense categories sorted by amount descending WITHOUT mutating the
 * input. `year-end-report-section` renders the raw `useYearEndSummary` cache
 * array; an in-place `.sort()` during render mutated the shared TanStack Query
 * cache (COMP-13, a Rules-of-React violation, doubly unsafe under React
 * Compiler). Spreading first leaves the source array untouched.
 */
export function sortExpenseCategoriesDesc(
	categories: readonly ExpenseCategoryTotal[],
): ExpenseCategoryTotal[] {
	return [...categories].sort((a, b) => b.amount - a.amount);
}
