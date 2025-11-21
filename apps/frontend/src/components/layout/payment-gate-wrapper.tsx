'use client'

/**
 * Payment Gate Wrapper
 *
 * Enforces subscription requirement for non-TENANT users in protected routes.
 * Verifies subscription status in real-time by checking against Stripe API.
 *
 * Security:
 * - Makes live API call to backend to verify subscription with Stripe
 * - Prevents access using stale JWT claims if subscription was cancelled
 * - Falls through to pricing redirect if Stripe verification fails (fail-closed)
 *
 * JWT claims (backup, used before real-time check):
 * - user_user_type: 'TENANT' | 'OWNER' | etc
 * - subscription_status: May be stale if subscription changed after token issuance
 */

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '#providers/auth-provider'
import { useSubscriptionStatus } from '#hooks/api/use-subscription-status'

interface PaymentGateWrapperProps {
	children: React.ReactNode
}

const VALID_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function PaymentGateWrapper({ children }: PaymentGateWrapperProps) {
	const router = useRouter()
	const { session } = useAuth()
	const [isValidating, setIsValidating] = useState(true)

	// Get user type from JWT (doesn't require real-time check)
	const [userType, setUserType] = useState<string>('TENANT')

	useEffect(() => {
		if (!session) return

		const accessToken = session.access_token
		if (accessToken) {
			try {
				const parts = accessToken.split('.')
				if (parts.length === 3 && parts[1]) {
					const payload = JSON.parse(
						atob(parts[1])
					) as Record<string, unknown>
					setUserType((payload.user_user_type as string) || 'TENANT')
				}
			} catch {
				// If decoding fails, use default
			}
		}
	}, [session])

	// Only enable real-time subscription check if user is not a tenant
	const requiresPayment = userType !== 'TENANT'
	const {
		data: subscriptionData,
		isLoading: isCheckingSubscription,
		error: subscriptionError
	} = useSubscriptionStatus({
		enabled: requiresPayment && !!session
	})

	useEffect(() => {
		// Don't validate until we have all necessary data
		if (!session || (requiresPayment && isCheckingSubscription)) {
			return
		}

		// For tenants, no payment required
		if (!requiresPayment) {
			setIsValidating(false)
			return
		}

		// For non-tenants, check real-time subscription status
		const hasValidSubscription = subscriptionData?.subscriptionStatus
			? VALID_SUBSCRIPTION_STATUSES.has(subscriptionData.subscriptionStatus)
			: false
		const hasStripeCustomer = Boolean(subscriptionData?.stripeCustomerId)

		// Redirect to pricing if payment is required but not complete
		// Also redirect if subscription check failed (fail-closed security)
		if (
			!hasValidSubscription ||
			!hasStripeCustomer ||
			subscriptionError
		) {
			const currentPath =
				typeof window !== 'undefined' ? window.location.pathname : '/manage'
			const pricingUrl = `/pricing?required=true&redirectTo=${encodeURIComponent(currentPath)}`
			router.push(pricingUrl)
			return
		}

		setIsValidating(false)
	}, [session, requiresPayment, isCheckingSubscription, subscriptionData, subscriptionError, router])

	// Show nothing while validating payment status
	if (isValidating) {
		return null
	}

	return <>{children}</>
}
