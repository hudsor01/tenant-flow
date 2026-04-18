/**
 * Auth callback for Supabase OAuth code exchange, email OTP verification,
 * and password recovery token handling. Landlord-only: TENANT user_type
 * (legacy) is treated as unknown and falls through to /dashboard so the
 * proxy + subscription gate decides where they land.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '#types/supabase'
import { env } from '#env'

/**
 * Valid OTP types for Supabase auth verification.
 * AUTH-15: Validated before calling verifyOtp to prevent unnecessary network calls.
 */
export const VALID_OTP_TYPES = ['signup', 'email', 'recovery', 'magiclink', 'invite'] as const
type ValidOtpType = typeof VALID_OTP_TYPES[number]

export function isValidOtpType(type: string | null): type is ValidOtpType {
	return type !== null && type !== '' && (VALID_OTP_TYPES as readonly string[]).includes(type)
}

/**
 * Build the redirect URL using NEXT_PUBLIC_APP_URL or request origin.
 * AUTH-13: x-forwarded-host is intentionally ignored to prevent host header injection attacks.
 */
function buildRedirectUrl(
	_request: NextRequest,
	origin: string,
	path: string
): string {
	const siteUrl = process.env.NEXT_PUBLIC_APP_URL || origin
	return `${siteUrl}${path}`
}

/**
 * Post-auth destination. PENDING / unset → role selection. Everything else
 * (OWNER, ADMIN, or legacy TENANT) → /dashboard; the proxy gate routes from
 * there based on subscription state.
 */
function getDashboardRoute(userType: string | undefined): string {
	if (userType === 'PENDING' || !userType) return '/auth/select-role'
	return '/dashboard'
}

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const tokenHash = searchParams.get('token_hash')
	const type = searchParams.get('type')
	const nextParam = searchParams.get('next')
	// Validate that `next` is a relative path to prevent open redirect attacks.
	// Must start with "/" but not "//" (which browsers interpret as protocol-relative URLs).
	const next =
		nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
			? nextParam
			: '/dashboard'

	const cookieStore = await cookies()

	const supabase = createServerClient<Database>(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						)
					} catch {
						// The `setAll` method was called from a Server Component.
						// This can be ignored if you have middleware refreshing
						// user sessions.
					}
				}
			}
		}
	)

	// Handle email confirmation via token_hash
	if (tokenHash && type) {
		// AUTH-15: Validate OTP type against allowlist before calling Supabase
		if (!isValidOtpType(type)) {
			return NextResponse.redirect(buildRedirectUrl(request, origin, '/auth/callback?error=invalid_type'))
		}

		const { data, error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type
		})

		if (!error && data?.session) {
			// For signup confirmation: route to dashboard based on user_type
			if (type === 'signup' || type === 'email') {
				const userType = data.session.user.app_metadata?.user_type as
					| string
					| undefined
				const destination = getDashboardRoute(userType)
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, destination)
				)
			}

			// For password recovery: route to update-password page
			if (type === 'recovery') {
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, '/auth/update-password')
				)
			}
		}

		// Verification failed - redirect to confirm-email with error
		if (type === 'signup' || type === 'email') {
			return NextResponse.redirect(
				buildRedirectUrl(
					request,
					origin,
					'/auth/confirm-email?error=invalid_token'
				)
			)
		}

		// Recovery token failed - redirect to update-password with error hash
		return NextResponse.redirect(
			buildRedirectUrl(
				request,
				origin,
				'/auth/update-password#error=access_denied&error_description=This+link+has+expired+or+is+invalid'
			)
		)
	}

	// Handle OAuth code exchange (Google, etc.)
	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error && data?.session) {
			// AUTH-08: OAuth provider (Google) is trusted for email verification.
			// No additional email_confirmed_at check required per user decision.
			const userType = data.session.user.app_metadata?.user_type as
				| string
				| undefined

			// PENDING or unset user_type routes to role selection
			if (userType === 'PENDING' || !userType) {
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, '/auth/select-role')
				)
			}

			// User has a known role, route to their dashboard
			return NextResponse.redirect(
				buildRedirectUrl(request, origin, next)
			)
		}
	}

	// Auth error - redirect to login with error param
	return NextResponse.redirect(
		buildRedirectUrl(request, origin, '/login?error=oauth_failed')
	)
}
