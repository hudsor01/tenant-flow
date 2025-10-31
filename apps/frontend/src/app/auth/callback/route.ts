import { logger } from '@repo/shared/lib/frontend-logger'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const VALID_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

function safeNextPath(nextParam: string | null): string {
	if (!nextParam || !nextParam.startsWith('/')) {
		return '/manage'
	}
	return nextParam
}

function redirectTo(origin: string, path: string): NextResponse {
	return NextResponse.redirect(`${origin}${path}`)
}

function redirectToPricing(origin: string, request: NextRequest, redirectToPath: string) {
	const pricingUrl = new URL('/pricing', origin)
	pricingUrl.searchParams.set('required', 'true')
	pricingUrl.searchParams.set('redirectTo', redirectToPath)

	const forwardedHost = request.headers.get('x-forwarded-host')
	const isLocalEnv = process.env.NODE_ENV === 'development'

	if (isLocalEnv) {
		return NextResponse.redirect(pricingUrl.toString())
	}

	if (forwardedHost) {
		return NextResponse.redirect(
			`https://${forwardedHost}${pricingUrl.pathname}${pricingUrl.search}`
		)
	}

	return NextResponse.redirect(pricingUrl.toString())
}

function finalizeRedirect(origin: string, request: NextRequest, nextPath: string) {
	const forwardedHost = request.headers.get('x-forwarded-host')
	const isLocalEnv = process.env.NODE_ENV === 'development'

	if (isLocalEnv) {
		return NextResponse.redirect(`${origin}${nextPath}`)
	}

	if (forwardedHost) {
		return NextResponse.redirect(`https://${forwardedHost}${nextPath}`)
	}

	return NextResponse.redirect(`${origin}${nextPath}`)
}

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const nextParam = safeNextPath(searchParams.get('next'))
	const errorParam = searchParams.get('error')

	if (errorParam) {
		logger.warn('OAuth callback received error parameter', {
			action: 'oauth_callback_error_param',
			metadata: { error: errorParam }
		})
		return redirectTo(origin, `/login?error=${encodeURIComponent(errorParam)}`)
	}

	if (!code) {
		return redirectTo(origin, '/login?error=oauth_failed')
	}

	try {
		const cookieStore = await cookies()
		const supabase = createServerClient<Database>(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
			{
				cookies: {
					getAll: () => cookieStore.getAll(),
					setAll: cookiesToSet => {
						cookiesToSet.forEach(({ name, value, options }) => {
							try {
								cookieStore.set(name, value, options)
							} catch {
								// Ignored: Next.js may throw when mutating cookies outside request scope
							}
						})
					}
				}
			}
		)
		const { data, error } = await supabase.auth.exchangeCodeForSession(code)

		if (error || !data.session) {
			logger.error('OAuth callback error - exchangeCodeForSession failed', {
				action: 'oauth_callback_failed',
				metadata: {
					error: error?.message ?? 'Unknown',
					errorCode: error?.code,
					codePreview: `${code.substring(0, 10)}...`
				}
			})
			return redirectTo(origin, '/login?error=oauth_failed')
		}

		const user = data.session.user

		const {
			data: profile,
			error: profileError
		} = await supabase
			.from('users')
			.select('role, subscription_status, stripeCustomerId')
			.eq('supabaseId', user.id)
			.single()

		if (profileError) {
			logger.warn('OAuth callback could not load user profile', {
				action: 'oauth_profile_missing',
				metadata: { userId: user.id, error: profileError.message }
			})
		}

		const requiresPayment = profile?.role !== 'TENANT'
	const hasValidSubscription = profile?.subscription_status
		? VALID_SUBSCRIPTION_STATUSES.has(profile.subscription_status)
		: false
		const hasStripeCustomer = Boolean(profile?.stripeCustomerId)

		if (requiresPayment && (!hasValidSubscription || !hasStripeCustomer)) {
			logger.info('OAuth user requires payment - redirecting to pricing', {
				action: 'oauth_payment_required',
				metadata: {
					userId: user.id,
					role: profile?.role,
					subscriptionStatus: profile?.subscription_status,
					hasValidSubscription,
					hasStripeCustomer
				}
			})
			return redirectToPricing(origin, request, nextParam)
		}

		const destination =
			profile?.role === 'TENANT' ? (nextParam === '/manage' ? '/tenant' : nextParam) : nextParam

		logger.info('OAuth callback successful', {
			action: 'oauth_callback_success',
			metadata: {
				userId: user.id,
				role: profile?.role,
				next: destination
			}
		})

		return finalizeRedirect(origin, request, destination)
	} catch (callbackError) {
		logger.error('OAuth callback exception', {
			action: 'oauth_callback_exception',
			metadata: {
				error:
					callbackError instanceof Error ? callbackError.message : String(callbackError)
			}
		})
		return redirectTo(origin, '/login?error=oauth_failed')
	}
}
