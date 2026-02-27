/**
 * Auth Callback Route
 *
 * Handles multiple Supabase auth callback flows:
 * 1. OAuth (Google) - exchanges authorization code for session
 * 2. Email confirmation - verifies token_hash from confirmation email
 * 3. Password recovery - exchanges code for session (handled by update-password page)
 *
 * CRITICAL: This route is essential for Google OAuth and email confirmation to work.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@repo/shared/types/supabase'
import { env } from '#env'

/**
 * Build the redirect URL respecting proxy headers and environment
 */
function buildRedirectUrl(
	request: NextRequest,
	origin: string,
	path: string
): string {
	const forwardedHost = request.headers.get('x-forwarded-host')
	const isLocalEnv = env.NODE_ENV === 'development'

	if (isLocalEnv) {
		return `${origin}${path}`
	}
	if (forwardedHost) {
		return `https://${forwardedHost}${path}`
	}
	return `${origin}${path}`
}

/**
 * Determine dashboard route based on user_type from session metadata
 */
function getDashboardRoute(userType: string | undefined): string {
	if (userType === 'TENANT') return '/tenant'
	if (userType === 'PENDING' || !userType) return '/auth/select-role'
	return '/dashboard'
}

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const tokenHash = searchParams.get('token_hash')
	const type = searchParams.get('type')
	const next = searchParams.get('next') ?? '/dashboard'

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
		const verifyType = type as 'signup' | 'email' | 'recovery'

		const { data, error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type: verifyType
		})

		if (!error && data?.session) {
			// For signup confirmation: route to dashboard based on user_type
			if (verifyType === 'signup' || verifyType === 'email') {
				const userType = data.session.user.app_metadata?.user_type as
					| string
					| undefined
				const destination = getDashboardRoute(userType)
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, destination)
				)
			}

			// For password recovery: route to update-password page
			if (verifyType === 'recovery') {
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, '/auth/update-password')
				)
			}
		}

		// Verification failed - redirect to confirm-email with error
		if (verifyType === 'signup' || verifyType === 'email') {
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
			// Determine redirect based on user type
			const userType = data.session.user.app_metadata?.user_type as
				| string
				| undefined
			const destination =
				userType === 'TENANT'
					? '/tenant'
					: userType === 'PENDING' || !userType
						? '/auth/select-role'
						: next

			return NextResponse.redirect(
				buildRedirectUrl(request, origin, destination)
			)
		}
	}

	// Auth error - redirect to login with error param
	return NextResponse.redirect(
		buildRedirectUrl(request, origin, '/login?error=oauth_failed')
	)
}
