'use client'

/**
 * Payment Gate Wrapper
 *
 * Enforces subscription requirement for non-TENANT users in protected routes.
 * Redirects users without active subscriptions to /pricing.
 *
 * Uses the JWT claims injected by the Custom Access Token Hook:
 * - user_user_type: 'TENANT' | 'OWNER' | etc
 * - stripe_customer_id: from Stripe Sync Engine or null
 * - subscription_status: 'active' | 'trialing' | null
 */

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '#hooks/api/use-auth'
import { useAuth } from '#providers/auth-provider'

interface PaymentGateWrapperProps {
	children: React.ReactNode
}

const VALID_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function PaymentGateWrapper({ children }: PaymentGateWrapperProps) {
	const router = useRouter()
	const { session } = useAuth()
	const { data: user, isLoading } = useUser()
	const [isValidating, setIsValidating] = useState(true)

	useEffect(() => {
		// Don't validate until we have both auth state and user data
		if (!session || isLoading) {
			return
		}

		// Get JWT claims from session
		const accessToken = session.access_token
		let userType = 'TENANT' // default
		let subscriptionStatus: string | null = null

		// Decode JWT to extract custom claims
		if (accessToken) {
			try {
				const parts = accessToken.split('.')
				if (parts.length === 3 && parts[1]) {
					const payload = JSON.parse(
						atob(parts[1])
					) as Record<string, unknown>
					userType = (payload.user_user_type as string) || 'TENANT'
					subscriptionStatus = (payload.subscription_status as string) || null
				}
			} catch {
				// If decoding fails, continue with defaults
			}
		}

		// Check payment requirements
		const requiresPayment = userType !== 'TENANT'
		const hasValidSubscription = subscriptionStatus
			? VALID_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
			: false
		const hasStripeCustomer = Boolean(user?.stripe_customer_id)

		// Redirect to pricing if payment is required but not complete
		if (requiresPayment && (!hasValidSubscription || !hasStripeCustomer)) {
			const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/manage'
			const pricingUrl = `/pricing?required=true&redirectTo=${encodeURIComponent(currentPath)}`
			router.push(pricingUrl)
			return
		}

		setIsValidating(false)
	}, [session, user, isLoading, router])

	// Show nothing while validating payment status
	if (isValidating || (session && isLoading)) {
		return null
	}

	return <>{children}</>
}
