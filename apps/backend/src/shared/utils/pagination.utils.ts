/**
 * Pagination utilities for NestJS controllers
 *
 * Provides reusable, testable pagination helpers to ensure
 * consistent limit/offset handling across the application.
 */

/** Default pagination limit when not specified */
export const DEFAULT_PAGINATION_LIMIT = 10

/** Maximum allowed pagination limit to prevent excessive data retrieval */
export const MAX_PAGINATION_LIMIT = 100

/**
 * Validates and normalizes pagination limit parameter
 *
 * @param limit - Optional string limit from query params
 * @returns Normalized limit between 1 and MAX_PAGINATION_LIMIT
 *
 * @example
 * validateLimit(undefined) // returns DEFAULT_PAGINATION_LIMIT (10)
 * validateLimit('50')      // returns 50
 * validateLimit('500')     // returns MAX_PAGINATION_LIMIT (100)
 * validateLimit('abc')     // returns DEFAULT_PAGINATION_LIMIT (10)
 * validateLimit('-5')      // returns DEFAULT_PAGINATION_LIMIT (10)
 */
export function validateLimit(limit?: string): number {
	if (!limit) return DEFAULT_PAGINATION_LIMIT
	// Trim whitespace before validation
	const trimmed = limit.trim()
	if (!trimmed) return DEFAULT_PAGINATION_LIMIT
	// Validate format: only digits allowed (no negative signs, decimals, etc.)
	if (!/^\d+$/.test(trimmed)) return DEFAULT_PAGINATION_LIMIT
	const parsed = parseInt(trimmed, 10)
	// Clamp to valid range: at least 1, at most MAX_PAGINATION_LIMIT
	return Math.min(Math.max(parsed, 1), MAX_PAGINATION_LIMIT)
}
