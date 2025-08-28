// Client-side CSRF utilities only
// Server-side CSRF validation should be handled in server actions directly

/**
 * Client-side utility to get CSRF token from meta tag
 */
export function getClientCSRFToken(): string | null {
	if (typeof document === 'undefined') {
		return null
	}

	const metaTag = document.querySelector('meta[name="csrf-token"]')
	return metaTag?.getAttribute('content') || null
}

/**
 * Add CSRF token to FormData for client-side use
 */
export function addCSRFTokenToFormData(formData: FormData): void {
	const token = getClientCSRFToken()
	if (token) {
		formData.append('_token', token)
	}
}
