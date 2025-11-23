import type { CookieOptions, CookieOptionsWithName } from '@supabase/ssr'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { env } from '#config/env'

/**
 * Normalize Supabase-set cookie options so they work in local dev (http://localhost)
 * and production (https). We strip the domain Supabase returns (tenantflow.app)
 * so cookies bind to the current host, and we only mark them secure in production
 * to avoid browsers dropping them on http during E2E/dev.
 */
export function normalizeSupabaseCookieOptions(
	options?: CookieOptions
): Partial<ResponseCookie> | undefined {
	if (!options) return undefined

	const { domain, secure: _secure, ...rest } = options
	const isProd = env.NODE_ENV === 'production'

	return {
		...rest,
		sameSite: (rest.sameSite ?? 'lax') as ResponseCookie['sameSite'],
		httpOnly: rest.httpOnly ?? true,
		secure: isProd,
		// Preserve Supabase's domain in production so API subdomains receive the cookie,
		// but drop it in dev to allow localhost E2E to work.
		...(isProd && domain ? { domain } : {})
	}
}

type SetCookieFn =
	| ((name: string, value: string, options?: Partial<ResponseCookie>) => void)
	| ((name: string, value: string) => void)

export function applySupabaseCookies(
	setCookie: SetCookieFn,
	cookiesToSet: CookieOptionsWithName[]
) {
	cookiesToSet.forEach((cookie) => {
		// Type assertion: CookieOptionsWithName has name and value
		const cookieWithProps = cookie as typeof cookie & { name: string; value: string }
		const name = cookieWithProps.name
		const value = cookieWithProps.value
		// Extract all other properties as options
		const { name: _, value: __, ...options } = cookieWithProps
		const normalizedOptions = normalizeSupabaseCookieOptions(options as CookieOptions)
		// Check if setCookie accepts 3 parameters (response.cookies) or 2 (request.cookies)
		// If normalized options exist and function accepts options, pass them; otherwise just name and value
		try {
			if (normalizedOptions) {
				(setCookie as (name: string, value: string, options: Partial<ResponseCookie>) => void)(name, value, normalizedOptions)
			} else {
				setCookie(name, value)
			}
		} catch {
			// Fallback for request.cookies which only accepts 2 params
			;(setCookie as (name: string, value: string) => void)(name, value)
		}
	})
}
