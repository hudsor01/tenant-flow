/**
 * Utility functions for query parameter handling
 */

/**
 * Filters out undefined values from query parameters for API client compatibility
 */
export function filterQueryParams<T extends Record<string, unknown>>(
	params?: T
): Record<string, string | number | boolean> | undefined {
	if (!params) return undefined
	
	const filtered: Record<string, string | number | boolean> = {}
	
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null) {
			// Convert value to acceptable API client types
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				filtered[key] = value
			} else {
				// Convert other types to string
				filtered[key] = String(value)
			}
		}
	}
	
	return Object.keys(filtered).length > 0 ? filtered : undefined
}