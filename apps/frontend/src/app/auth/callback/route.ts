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

const VALID_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])
const SUPPORTED_ALGORITHMS = new Set(['HS256', 'RS256', 'ES256'])
type SupportedAlgorithm = 'HS256' | 'RS256' | 'ES256'

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getConfiguredAlgorithm(): SupportedAlgorithm | null {
	const value =
		process.env.SUPABASE_JWT_ALGORITHM ||
		process.env.NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM

	if (!value) {
		return null
	}

	const normalized = value.toUpperCase().trim()
	return SUPPORTED_ALGORITHMS.has(normalized as SupportedAlgorithm)
		? (normalized as SupportedAlgorithm)
		: null
}

function detectTokenAlgorithm(token: string): SupportedAlgorithm | null {
	try {
		const parts = token.split('.')
		if (parts.length !== 3) {
			console.warn('JWT validation failed: token does not have exactly 3 parts')
			return null
		}
		const [header] = parts
		if (!header) return null
		const padded = header + '='.repeat((4 - (header.length % 4)) % 4)
		const parsed = JSON.parse(
			Buffer.from(padded, 'base64').toString('utf8')
		) as { alg?: string }
		const alg = parsed.alg?.toUpperCase()
		return alg && SUPPORTED_ALGORITHMS.has(alg as SupportedAlgorithm)
			? (alg as SupportedAlgorithm)
			: null
	} catch {
		return null
	}
}

function resolveAlgorithm(token: string): SupportedAlgorithm | null {
	// SECURITY: Algorithm must be explicitly configured or detected from token.
	// Never default to HS256 - this prevents accepting tokens with unknown/unsafe algorithms.
	// In production, SUPABASE_JWT_ALGORITHM environment variable MUST be set.
	return getConfiguredAlgorithm() ?? detectTokenAlgorithm(token)
}

function getSupabaseJwks() {
	const key = `${SUPABASE_URL}/auth/v1/keys`
	if (!jwksCache.has(key)) {
		jwksCache.set(key, createRemoteJWKSet(new URL(key)))
	}
	return jwksCache.get(key)!
}

async function verifySupabaseJwt(
	token: string
): Promise<Record<string, unknown> | null> {
	const algorithm = resolveAlgorithm(token)

	// SECURITY: Fail fast if algorithm cannot be determined
	if (!algorithm) {
		logger.error(
			'JWT verification failed: algorithm could not be determined. SUPABASE_JWT_ALGORITHM must be explicitly configured in production.',
			{ tokenPrefix: token.substring(0, 20) }
		)
		return null
	}

	try {
		if (algorithm === 'HS256') {
			// SECURITY: Only use SUPABASE_JWT_SECRET for HS256 verification
			// Do NOT fall back to service key or other secrets
			const secret = process.env.SUPABASE_JWT_SECRET

			if (!secret) {
				logger.error(
					'HS256 JWT verification failed: SUPABASE_JWT_SECRET is not configured. Cannot verify token.',
					{ algorithm }
				)
				return null
			}

			const { payload } = await jwtVerify(
				token,
				new TextEncoder().encode(secret),
				{
					issuer: `${SUPABASE_URL}/auth/v1`,
					audience: 'authenticated',
					algorithms: [algorithm]
				}
			)

			return payload
		}

		// RS256/ES256: Use JWKS for verification
		const { payload } = await jwtVerify(token, getSupabaseJwks(), {
			issuer: `${SUPABASE_URL}/auth/v1`,
			audience: 'authenticated',
			algorithms: [algorithm]
		})

		return payload
	} catch (err) {
		// SECURITY: Do NOT fall back to unverified decode on verification failure
		// Any JWT that fails verification MUST be rejected
		logger.error('JWT verification failed - token rejected', {
			error: err instanceof Error ? err.message : String(err),
			algorithm,
			// Log minimal info for debugging, avoid logging full token
			tokenPrefix: token.substring(0, 20)
		})
		return null
	}
}

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

		if (error) {
			logger.error('getJwtClaims: getSession returned error', { error })
			return null
		}
		if (!session) {
			logger.warn('getJwtClaims: no session returned from getSession')
			return null
		}
		if (!session.access_token) {
			logger.warn('getJwtClaims: session missing access_token')
			return null
		}

		// Decode the JWT to extract custom claims added by the auth hook
		return await verifySupabaseJwt(session.access_token)
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
			logger.error('OAuth callback could not extract user role from JWT claims - terminating', {
				action: 'oauth_role_missing',
				metadata: { userId: user.id, hasClaims: Boolean(claims) }
			})
			return redirectTo(origin, '/login?error=role_missing')
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
