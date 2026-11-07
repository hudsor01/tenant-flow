import type { YearEndSummary } from "#types/reports";

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

/**
 * Why the year's downloads are off, or null while the year loads or once its
 * summary is in. The year-end page's Download PDF and its section's Download
 * CSV keep their tab stops (aria-disabled, not disabled) and say it through
 * aria-describedby, as the statements' Export does (OD-12).
 */
export function yearEndUnavailableReason({
	year,
	yearEndData,
	ledgerUnavailable,
	isLoadingYearEnd,
}: {
	year: number;
	yearEndData: YearEndSummary | undefined;
	ledgerUnavailable: boolean;
	isLoadingYearEnd: boolean;
}): string | null {
	if (isLoadingYearEnd) return null;
	if (ledgerUnavailable) {
		return "The rent ledger totals the year-end report is built on aren't available yet.";
	}
	if (yearEndData === undefined) {
		return `The figures for ${year} aren't available.`;
	}
	return null;
}
