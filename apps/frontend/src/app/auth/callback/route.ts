import { logger } from '@repo/shared/lib/frontend-logger'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	// if "next" is in param, use it as the redirect URL
	const nextParam = searchParams.get('next')

	if (code) {
		try {
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

			if (error) {
				logger.error('OAuth callback error - exchangeCodeForSession failed', {
					action: 'oauth_callback_failed',
					metadata: {
						error: error.message,
						errorCode: error.code,
						errorName: error.name,
						code: code?.substring(0, 10) + '...' // Log partial code for debugging
					}
				})
				return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
			}

			if (data.session) {
				// Fetch user role and payment status to determine redirect destination
				// Per Stripe best practices - check subscription_status field
				const { data: userProfile } = await supabase
					.from('users')
					.select('role, subscription_status, stripeCustomerId')
					.eq('supabaseId', data.session.user.id)
					.single()

				// Check if user needs to complete payment (OWNER/MANAGER/ADMIN only)
				const requiresPayment = userProfile?.role !== 'TENANT'

				// Check subscription status per Stripe best practices
				// Valid statuses for access: active, trialing
				const validStatuses = ['active', 'trialing']
				const hasValidSubscription =
					userProfile?.subscription_status &&
					validStatuses.includes(userProfile.subscription_status)
				const hasNoStripeCustomer = !userProfile?.stripeCustomerId

				// Redirect to pricing if payment required
				if (requiresPayment && (!hasValidSubscription || hasNoStripeCustomer)) {
					logger.info('OAuth user requires payment - redirecting to pricing', {
						action: 'oauth_payment_required',
						metadata: {
							userId: data.session.user.id,
							role: userProfile?.role,
							subscriptionStatus: userProfile?.subscription_status,
							hasValidSubscription: hasValidSubscription,
							hasStripeCustomer: !hasNoStripeCustomer
						}
					})

					const pricingUrl = new URL('/pricing', origin)
					pricingUrl.searchParams.set('required', 'true')
					pricingUrl.searchParams.set('redirectTo', nextParam || '/manage')

					const forwardedHost = request.headers.get('x-forwarded-host')
					const isLocalEnv = process.env.NODE_ENV === 'development'

					if (isLocalEnv) {
						return NextResponse.redirect(pricingUrl.toString())
					} else if (forwardedHost) {
						return NextResponse.redirect(
							`https://${forwardedHost}${pricingUrl.pathname}${pricingUrl.search}`
						)
					} else {
						return NextResponse.redirect(pricingUrl.toString())
					}
				}

				// Determine destination based on user role
				let next = '/manage' // Default for OWNER, MANAGER, ADMIN

				if (userProfile?.role === 'TENANT') {
					next = '/tenant'
				}

				// Honor explicit nextParam if provided (unless it conflicts with role)
				if (nextParam && nextParam.startsWith('/')) {
					next = nextParam
				}

				logger.info('OAuth callback successful', {
					action: 'oauth_callback_success',
					metadata: {
						userId: data.session.user.id,
						role: userProfile?.role,
						next
					}
				})

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
			}
		} catch (error) {
			logger.error('OAuth callback error', {
				action: 'oauth_callback_exception',
				metadata: {
					error: error instanceof Error ? error.message : String(error)
				}
			})
			return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
		}
	}

	// return the user to login with error parameter for toast display
	return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
