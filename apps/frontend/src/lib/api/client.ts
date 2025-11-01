/**
 * Client-side API utility for TanStack Query hooks
 * Mirrors server.ts pattern with Authorization header from Supabase session
 *
 * Pattern consistent with reports-client.ts and stripe-client.ts
 */
import { createClient } from '#lib/supabase/client'
import { API_BASE_URL } from '#lib/api-config'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'ClientAPI' })

/**
 * Get auth headers with Supabase JWT token
 * Extracted for reuse across fetch calls
 */
async function getAuthHeaders(additionalHeaders?: Record<string, string>): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...additionalHeaders
	}

	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()

	// Add Authorization header if session exists
	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	} else {
		logger.warn('No valid session found for API request', {
			metadata: {
				hasSession: !!session
			}
		})
	}

	return headers
}

/**
 * Client-side fetch with Supabase authentication
 *
 * Usage in TanStack Query hooks:
 * ```typescript
 * queryFn: () => clientFetch<Property>('/api/v1/properties/123')
 * mutationFn: (data) => clientFetch<Property>('/api/v1/properties', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * })
 * ```
 */
export async function clientFetch<T>(
	endpoint: string,
	options?: RequestInit
): Promise<T> {
	// Build headers from options
	const customHeaders: Record<string, string> = {}
	if (options?.headers) {
		Object.entries(options.headers).forEach(([key, value]) => {
			if (typeof value === 'string') {
				customHeaders[key] = value
			}
		})
	}

	// Get auth headers (includes Authorization + custom headers)
	const headers = await getAuthHeaders(customHeaders)

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers
	})

	if (!response.ok) {
		// Log error for debugging
		const errorText = await response.text()
		logger.error('API request failed', {
			metadata: {
				status: response.status,
				endpoint,
				statusText: response.statusText,
				errorText: errorText.substring(0, 500)
			}
		})

		// Throw error with status for error handling
		throw new Error(
			`API Error (${response.status}): ${errorText || response.statusText}`
		)
	}

	const data = await response.json()

	// Handle API response format (success/data pattern)
	if (data.success === false) {
		throw new Error(data.error || data.message || 'API request failed')
	}

	// Return data directly or the whole response based on API format
	return data.data || data
}
