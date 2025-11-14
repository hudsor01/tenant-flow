export const runtime = 'edge'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'

/**
 * Auth Confirmation Route Handler
 * Exchanges Supabase Auth token_hash from email link for a session
 * Called after user clicks invitation email link
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const token_hash = searchParams.get('token_hash')
	const type = searchParams.get('type')
	const next = searchParams.get('next') ?? '/tenant/onboarding'

	if (token_hash && type) {
		const cookieStore = await cookies()

		const supabase = createServerClient(
			SUPABASE_URL,
			SUPABASE_PUBLISHABLE_KEY,
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

		// Valid OTP types (as per Supabase EmailOtpType)
		const validOtpTypes: EmailOtpType[] = ['email', 'recovery', 'invite', 'email_change']

		// Validate type before using it
		if (!validOtpTypes.includes(type as EmailOtpType)) {
			return NextResponse.redirect(
				new URL('/error?message=Invalid+OTP+type', request.url)
			)
		}

		// Verify OTP and exchange for session
		const { error } = await supabase.auth.verifyOtp({
			token_hash,
			type: type as EmailOtpType
		})

		if (!error) {
			// Session stored in cookies automatically
			return NextResponse.redirect(new URL(next, request.url))
		}
	}

	// Redirect to error page if verification fails
	return NextResponse.redirect(
		new URL('/error?message=Invalid+invitation+link', request.url)
	)
}
