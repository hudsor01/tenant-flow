import { HttpResponse } from 'msw'

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'

/**
 * Build a full Supabase REST URL for use in MSW handlers.
 * Matches the URLs that supabase-js generates under the hood.
 */
export function supabaseUrl(path: string): string {
	return `${SUPABASE_URL}${path}`
}

/**
 * Create a PostgREST-style list response.
 * Supabase returns data as JSON array with content-range header for count.
 */
export function postgrestList<T>(data: T[], count?: number): HttpResponse {
	const total = count ?? data.length
	return new HttpResponse(JSON.stringify(data), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Range': `0-${Math.max(data.length - 1, 0)}/${total}`
		}
	})
}

/**
 * Create a PostgREST-style single-row response.
 */
export function postgrestSingle<T>(data: T): HttpResponse {
	return HttpResponse.json(data, { status: 200 })
}

/**
 * Create a PostgREST-style empty response (no rows matched).
 */
export function postgrestEmpty(): HttpResponse {
	return new HttpResponse(JSON.stringify([]), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Range': '*/0'
		}
	})
}

/**
 * Create a PostgREST-style error response.
 */
export function postgrestError(
	message: string,
	code: string = 'PGRST116',
	status: number = 400
): HttpResponse {
	return HttpResponse.json(
		{ message, code, details: null, hint: null },
		{ status }
	)
}

/**
 * Create a Supabase RPC response (used for /rest/v1/rpc/* calls).
 */
export function rpcResponse<T>(data: T): HttpResponse {
	return HttpResponse.json(data, { status: 200 })
}

/**
 * Create a Supabase Auth API response for getUser().
 */
export function authUserResponse(user: {
	id: string
	email: string
	user_metadata?: Record<string, unknown>
}): HttpResponse {
	return HttpResponse.json({
		id: user.id,
		aud: 'authenticated',
		role: 'authenticated',
		email: user.email,
		email_confirmed_at: '2024-01-01T00:00:00Z',
		app_metadata: { provider: 'email' },
		user_metadata: user.user_metadata ?? {},
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	})
}
