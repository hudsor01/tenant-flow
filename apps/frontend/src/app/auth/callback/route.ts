import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient, logger } from '@repo/shared'

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	// if "next" is in param, use it as the redirect URL
	let next = searchParams.get('next') ?? '/'
	if (!next.startsWith('/')) {
		// if "next" is not a relative URL, use the default
		next = '/'
	}

	if (code) {
		try {
			const cookieStore = cookies()
			const supabase = createServerSupabaseClient(cookieStore)
			const { data, error } = await supabase.auth.exchangeCodeForSession(code)

			if (error) {
				logger.error({ error: error.message }, 'OAuth callback error')
				return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
			}

			if (data.session) {
				logger.info({ userId: data.session.user.id, next }, 'OAuth callback successful')
			}

			// Handle successful authentication with proper redirect logic
			const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
			const isLocalEnv = process.env.NODE_ENV === 'development'
			if (isLocalEnv) {
				// we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
				return NextResponse.redirect(`${origin}${next}`)
			} else if (forwardedHost) {
				return NextResponse.redirect(`https://${forwardedHost}${next}`)
			} else {
				return NextResponse.redirect(`${origin}${next}`)
			}
		} catch (error) {
			logger.error({ error: error instanceof Error ? error.message : String(error) }, 'OAuth callback error')
			return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent('Authentication failed')}`)
		}
	}

	// return the user to an error page with instructions
	return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}