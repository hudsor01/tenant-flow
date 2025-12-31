/**
 * OAuth Callback Route
 *
 * Handles OAuth callback from Supabase after Google sign-in.
 * Exchanges the authorization code for a session and redirects
 * the user to the appropriate dashboard based on their role.
 *
 * CRITICAL: This route is essential for Google OAuth to work.
 * Without it, users clicking "Sign in with Google" will get a 404.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@repo/shared/types/supabase'

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const next = searchParams.get('next') ?? '/dashboard'

	if (code) {
		const cookieStore = await cookies()

		const supabase = createServerClient<Database>(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

		const { data, error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error && data?.session) {
			// Determine redirect based on user type
			const userType = data.session.user.app_metadata?.user_type as
				| string
				| undefined
			const destination = userType === 'TENANT' ? '/tenant' : next

			const forwardedHost = request.headers.get('x-forwarded-host')
			const isLocalEnv = process.env.NODE_ENV === 'development'

			if (isLocalEnv) {
				// Local development - use origin directly
				return NextResponse.redirect(`${origin}${destination}`)
			} else if (forwardedHost) {
				// Production behind proxy - use forwarded host
				return NextResponse.redirect(`https://${forwardedHost}${destination}`)
			} else {
				// Fallback to origin
				return NextResponse.redirect(`${origin}${destination}`)
			}
		}
	}

	// OAuth error - redirect to login with error param
	return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
