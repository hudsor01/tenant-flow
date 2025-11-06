import { logger } from '@repo/shared/lib/frontend-logger'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseJwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/keys`))

const VALID_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

async function getJwtClaims(
	supabase: SupabaseClient<Database>
): Promise<Record<string, unknown> | null> {
	try {
		// The auth hook (custom_access_token_hook) automatically enriches the JWT
		// with user_role, subscription_status, and stripe_customer_id claims.
		// We get the session after code exchange to read the enriched access token.
		const {
			data: { session },
			error
		} = await supabase.auth.getSession()

		if (error || !session?.access_token) {
			return null
		}

		// Decode the JWT to extract custom claims added by the auth hook
		const { payload } = await jwtVerify(session.access_token, supabaseJwks, {
			issuer: `${SUPABASE_URL}/auth/v1`,
			audience: 'authenticated'
		})
		return payload
	} catch (err) {
		logger.error('getJwtClaims failed while decoding session token', {
			error: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined
		})
		return null
	}
}

function getStringClaim(
	claims: Record<string, unknown> | null,
	key: string
): string | null {
	if (!claims) {
		return null
	}

	const value = claims[key]
	if (typeof value !== 'string') {
		return null
	}

	return value
}

function safeNextPath(nextParam: string | null): string {
	if (!nextParam || !nextParam.startsWith('/')) {
		return '/manage'
	}
	return nextParam
}

function redirectTo(origin: string, path: string): NextResponse {
	return NextResponse.redirect(`${origin}${path}`)
}

function redirectToPricing(
	origin: string,
	request: NextRequest,
	redirectToPath: string
) {
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

function finalizeRedirect(
	origin: string,
	request: NextRequest,
	nextPath: string
) {
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
			SUPABASE_URL,
			SUPABASE_PUBLISHABLE_KEY,
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

		// Extract role, subscription_status, and stripe_customer_id from JWT claims
		// instead of making a redundant database query
		const claims = await getJwtClaims(supabase)
		const role = getStringClaim(claims, 'user_role')
		const subscriptionStatus = getStringClaim(claims, 'subscription_status')
		const stripeCustomerId = getStringClaim(claims, 'stripe_customer_id')

		if (!role) {
			logger.warn(
				'OAuth callback could not extract user role from JWT claims',
				{
					action: 'oauth_claims_missing',
					metadata: { userId: user.id }
				}
			)
		}

		const requiresPayment = role !== 'TENANT'
		const hasValidSubscription = subscriptionStatus
			? VALID_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
			: false
		const hasStripeCustomer = Boolean(stripeCustomerId)

		if (requiresPayment && (!hasValidSubscription || !hasStripeCustomer)) {
			logger.info('OAuth user requires payment - redirecting to pricing', {
				action: 'oauth_payment_required',
				metadata: {
					userId: user.id,
					role: role,
					subscriptionStatus: subscriptionStatus,
					hasValidSubscription,
					hasStripeCustomer
				}
			})
			return redirectToPricing(origin, request, nextParam)
		}

		const destination =
			role === 'TENANT'
				? nextParam === '/manage'
					? '/tenant'
					: nextParam
				: nextParam

		logger.info('OAuth callback successful', {
			action: 'oauth_callback_success',
			metadata: {
				userId: user.id,
				role: role,
				next: destination
			}
		})

		return finalizeRedirect(origin, request, destination)
	} catch (callbackError) {
		logger.error('OAuth callback exception', {
			action: 'oauth_callback_exception',
			metadata: {
				error:
					callbackError instanceof Error
						? callbackError.message
						: String(callbackError)
			}
		})
		return redirectTo(origin, '/login?error=oauth_failed')
	}
}
