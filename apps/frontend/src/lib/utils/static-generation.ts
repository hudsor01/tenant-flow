/**
 * Utility to safely handle errors during static generation
 * 
 * During Next.js static generation (build time), API calls will fail
 * because the backend isn't running. This utility provides graceful
 * fallbacks during build while preserving error boundaries in browser.
 */

/**
 * Check if we're in static generation mode (server-side, build time)
 */
export function isStaticGeneration(): boolean {
	return typeof window === 'undefined'
}

/**
 * Handle API errors gracefully during static generation
 * 
 * @param error - The error from the API call
 * @param fallback - Fallback component to render during static generation
 * @returns Either the fallback (during static gen) or throws the error (in browser)
 */
export function handleStaticGenerationError<T>(
	error: unknown, 
	fallback: T
): T | never {
	if (isStaticGeneration()) {
		// During static generation, return fallback instead of throwing
		return fallback
	}
	
	// In browser, throw to be caught by error boundary
	throw error
}