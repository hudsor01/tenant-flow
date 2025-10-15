/**
 * SQL Safety Utilities
 * Prevents SQL injection in search queries
 */

/**
 * Escapes special characters in ILIKE patterns to prevent SQL injection
 * Escapes: % _ \ (wildcards and escape character)
 *
 * @param input - User-provided search string
 * @returns Sanitized string safe for ILIKE queries
 *
 * @example
 * escapeILikePattern("50% off") // "50\\% off"
 * escapeILikePattern("user_123") // "user\\_123"
 */
export function escapeILikePattern(input: string): string {
	if (!input || typeof input !== 'string') {
		return ''
	}

	// Escape backslash first to avoid double-escaping
	return input
		.replace(/\\/g, '\\\\') // Escape backslash
		.replace(/%/g, '\\%') // Escape percent wildcard
		.replace(/_/g, '\\_') // Escape underscore wildcard
}

/**
 * Builds a safe ILIKE query pattern with wildcards
 *
 * @param input - User-provided search string
 * @param wildcardPosition - Where to add wildcards: 'both', 'start', 'end', 'none'
 * @returns Safe pattern for ILIKE queries
 *
 * @example
 * buildILikePattern("john", "both") // "%john%"
 * buildILikePattern("50%", "both") // "%50\\%%"
 */
export function buildILikePattern(
	input: string,
	wildcardPosition: 'both' | 'start' | 'end' | 'none' = 'both'
): string {
	const escaped = escapeILikePattern(input)

	switch (wildcardPosition) {
		case 'both':
			return `%${escaped}%`
		case 'start':
			return `%${escaped}`
		case 'end':
			return `${escaped}%`
		case 'none':
			return escaped
		default:
			return `%${escaped}%`
	}
}

/**
 * Validates and sanitizes search input
 * - Trims whitespace
 * - Limits length
 * - Removes null bytes
 *
 * @param input - User-provided search string
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized search string or null if invalid
 */
export function sanitizeSearchInput(
	input: string | null | undefined,
	maxLength = 100
): string | null {
	if (!input || typeof input !== 'string') {
		return null
	}

	// Remove null bytes (potential SQL injection vector)
	let sanitized = input.replace(/\0/g, '')

	// Trim whitespace
	sanitized = sanitized.trim()

	// Check length
	if (sanitized.length === 0 || sanitized.length > maxLength) {
		return null
	}

	return sanitized
}

/**
 * Builds a safe multi-column OR search query for Supabase
 *
 * @param searchTerm - User-provided search string
 * @param columns - Array of column names to search
 * @returns Safe OR query string for Supabase .or() method
 *
 * @example
 * buildMultiColumnSearch("john", ["name", "email"])
 * // Returns: "name.ilike.%john%,email.ilike.%john%"
 */
export function buildMultiColumnSearch(
	searchTerm: string,
	columns: string[]
): string {
	const sanitized = sanitizeSearchInput(searchTerm)
	if (!sanitized) {
		throw new Error('Invalid search term')
	}

	const pattern = buildILikePattern(sanitized)
	return columns.map(col => `${col}.ilike.${pattern}`).join(',')
}
