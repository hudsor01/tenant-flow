/**
 * Shared API Request Utility
 *
 * Native fetch wrapper with Supabase auth token injection.
 * Used by all TanStack Query hooks for NestJS API calls.
 */

import { createClient } from '#utils/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'

/**
 * Make an authenticated API request to NestJS backend
 * Automatically injects Supabase auth token
 */
export async function apiRequest<T>(
	endpoint: string,
	options?: RequestInit
): Promise<T> {
	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()

	const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${session?.access_token}`,
			...options?.headers
		}
	})

	if (!res.ok) {
		throw new Error(`API Error: ${res.status}`)
	}

	const text = await res.text()
	return text ? (JSON.parse(text) as T) : ({} as T)
}

/**
 * Make an authenticated API request with FormData (for file uploads)
 * Does not set Content-Type header - browser auto-sets multipart/form-data
 */
export async function apiRequestFormData<T>(
	endpoint: string,
	formData: FormData,
	options?: Omit<RequestInit, 'body'>
): Promise<T> {
	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()

	const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
		method: 'POST',
		...options,
		headers: {
			Authorization: `Bearer ${session?.access_token}`,
			...options?.headers
		},
		body: formData
	})

	if (!res.ok) {
		throw new Error(`API Error: ${res.status}`)
	}

	const text = await res.text()
	return text ? (JSON.parse(text) as T) : ({} as T)
}

/**
 * Make an authenticated API request that returns a blob (for file downloads)
 * Returns the raw Response so caller can handle blob/headers
 */
export async function apiRequestRaw(
	endpoint: string,
	options?: RequestInit
): Promise<Response> {
	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()

	const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
		...options,
		headers: {
			Authorization: `Bearer ${session?.access_token}`,
			...options?.headers
		}
	})

	if (!res.ok) {
		throw new Error(`API Error: ${res.status}`)
	}

	return res
}
