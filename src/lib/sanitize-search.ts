const MAX_SEARCH_LENGTH = 100

/**
 * Characters that can modify PostgREST filter semantics when interpolated
 * into .or() and .ilike() calls:
 * - , separates filter clauses in .or()
 * - . separates column.operator.value
 * - ( ) group filter logic
 * - " ' string delimiters
 * - \ escape character
 *
 * % is intentionally NOT stripped -- it is the ILIKE wildcard
 * and is already part of the template (e.g., %${search}%).
 */
const POSTGREST_DANGEROUS_CHARS = /[,.()"'\\]/g

/**
 * Strips PostgREST filter operators from user search input.
 * Silent strip -- no user-visible feedback when characters are removed.
 */
export function sanitizeSearchInput(input: string): string {
	return input
		.replace(POSTGREST_DANGEROUS_CHARS, '')
		.trim()
		.slice(0, MAX_SEARCH_LENGTH)
}
