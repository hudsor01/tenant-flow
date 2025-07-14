/**
 * Get the correct redirect URL for OAuth callbacks
 * Ensures HTTPS is used in production
 */
export function getAuthCallbackUrl(next?: string): string {
	// In production, always use HTTPS
	const protocol = window.location.hostname === 'localhost' ? 'http' : 'https'
	const host = window.location.host
	const nextParam = next ? `?next=${encodeURIComponent(next)}` : ''
	
	return `${protocol}://${host}/auth/callback${nextParam}`
}

/**
 * Get the base URL for the application
 * Ensures HTTPS is used in production
 */
export function getBaseUrl(): string {
	// In production, always use HTTPS
	const protocol = window.location.hostname === 'localhost' ? 'http' : 'https'
	const host = window.location.host
	
	return `${protocol}://${host}`
}