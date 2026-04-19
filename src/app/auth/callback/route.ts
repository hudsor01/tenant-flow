import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '#types/supabase'
import { env } from '#env'

export const VALID_OTP_TYPES = ['signup', 'email', 'recovery', 'magiclink', 'invite'] as const
type ValidOtpType = typeof VALID_OTP_TYPES[number]

export function isValidOtpType(type: string | null): type is ValidOtpType {
	return type !== null && type !== '' && (VALID_OTP_TYPES as readonly string[]).includes(type)
}

// AUTH-13: x-forwarded-host is intentionally ignored to prevent host header injection attacks.
function buildRedirectUrl(
	_request: NextRequest,
	origin: string,
	path: string
): string {
	const siteUrl = process.env.NEXT_PUBLIC_APP_URL || origin
	return `${siteUrl}${path}`
}

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const tokenHash = searchParams.get('token_hash')
	const type = searchParams.get('type')
	const nextParam = searchParams.get('next')
	// Must start with "/" but not "//" (protocol-relative URL) — open-redirect guard.
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
						// setAll called from Server Component — middleware refreshes the session.
					}
				}
			}
		}
	)

	if (tokenHash && type) {
		// AUTH-15: validate OTP type against allowlist before calling Supabase
		if (!isValidOtpType(type)) {
			return NextResponse.redirect(buildRedirectUrl(request, origin, '/auth/callback?error=invalid_type'))
		}

		const { data, error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type
		})

		if (!error && data?.session) {
			if (type === 'signup' || type === 'email') {
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, '/dashboard')
				)
			}

			if (type === 'recovery') {
				return NextResponse.redirect(
					buildRedirectUrl(request, origin, '/auth/update-password')
				)
			}
		}

		if (type === 'signup' || type === 'email') {
			return NextResponse.redirect(
				buildRedirectUrl(
					request,
					origin,
					'/auth/confirm-email?error=invalid_token'
				)
			)
		}

		return NextResponse.redirect(
			buildRedirectUrl(
				request,
				origin,
				'/auth/update-password#error=access_denied&error_description=This+link+has+expired+or+is+invalid'
			)
		)
	}

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error && data?.session) {
			// AUTH-08: OAuth provider (Google) is trusted for email verification.
			return NextResponse.redirect(buildRedirectUrl(request, origin, next))
		}
	}

	return NextResponse.redirect(
		buildRedirectUrl(request, origin, '/login?error=oauth_failed')
	)
}
