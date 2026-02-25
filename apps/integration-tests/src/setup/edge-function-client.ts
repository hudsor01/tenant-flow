import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const SUPABASE_PUBLISHABLE_KEY = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ?? ''
const SUPABASE_SECRET_KEY = process.env['SUPABASE_SECRET_KEY'] ?? ''

/**
 * Create an authenticated Supabase client and extract the access token.
 * Used for calling Edge Functions with Bearer auth.
 */
export async function createAuthenticatedClient(email: string, password: string) {
	const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
	const { data, error } = await client.auth.signInWithPassword({ email, password })
	if (error) throw new Error(`Auth failed for ${email}: ${error.message}`)
	return {
		client,
		accessToken: data.session.access_token,
		userId: data.user.id,
	}
}

/**
 * Create a service-role Supabase client (bypasses RLS).
 * Used for test setup/teardown and verifying DB state.
 */
export function createServiceClient(): SupabaseClient {
	return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
}

/**
 * Check if a Supabase Edge Function is deployed and reachable.
 * Uses a POST probe — OPTIONS is unreliable on the Supabase relay.
 * Returns false if the function returns 404 (not deployed).
 */
export async function isFunctionDeployed(functionName: string): Promise<boolean> {
	try {
		const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				apikey: SUPABASE_PUBLISHABLE_KEY,
			},
			body: JSON.stringify({}),
		})
		return response.status !== 404
	} catch {
		return false
	}
}

/**
 * Call a Supabase Edge Function with optional Bearer auth.
 */
export async function callEdgeFunction(
	functionName: string,
	options: {
		method?: 'GET' | 'POST'
		body?: Record<string, unknown>
		accessToken?: string
		queryParams?: Record<string, string>
		headers?: Record<string, string>
	} = {}
): Promise<{ status: number; data: unknown; headers: Headers }> {
	const { method = 'POST', body, accessToken, queryParams, headers: extraHeaders } = options

	let url = `${SUPABASE_URL}/functions/v1/${functionName}`
	if (queryParams) {
		const params = new URLSearchParams(queryParams)
		url += `?${params.toString()}`
	}

	const headers: Record<string, string> = {
		apikey: SUPABASE_PUBLISHABLE_KEY,
		...extraHeaders,
	}

	if (method === 'POST') {
		headers['Content-Type'] = 'application/json'
	}

	if (accessToken) {
		headers['Authorization'] = `Bearer ${accessToken}`
	}

	const fetchOptions: RequestInit = { method, headers }
	if (body && method === 'POST') {
		fetchOptions.body = JSON.stringify(body)
	}

	const response = await fetch(url, fetchOptions)
	const contentType = response.headers.get('content-type') ?? ''

	let data: unknown
	if (contentType.includes('application/json')) {
		data = await response.json()
	} else if (contentType.includes('text/csv')) {
		data = await response.text()
	} else if (contentType.includes('application/pdf')) {
		data = await response.arrayBuffer()
	} else {
		data = await response.text()
	}

	return { status: response.status, data, headers: response.headers }
}
