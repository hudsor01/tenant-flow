/**
 * Google OAuth Callback Handler
 *
 * Official Supabase OAuth pattern - exchanges code for session and redirects.
 * All auth gates (JWT verification, payment, user type routing) handled by middleware.
 *
 * See: https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@repo/shared/types/supabase'
import {
	SB_URL,
	SB_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const next = searchParams.get('next') || '/manage'

	// OAuth provider sent error
	if (searchParams.get('error')) {
		return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
	}

	// No authorization code from OAuth provider
	if (!code) {
		return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
	}

	const cookieStore = await cookies()
	const supabase = createServerClient<Database>(
		SB_URL,
		SB_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => cookieStore.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						cookieStore.set(name, value, options)
					})
				}
			}
		}
	)

	// Exchange authorization code for session (sets auth cookies automatically)
	const { error } = await supabase.auth.exchangeCodeForSession(code)

	if (error) {
		return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
	}

	// Success - middleware will handle JWT verification, payment gates, user type routing
	return NextResponse.redirect(`${origin}${next}`)
}
