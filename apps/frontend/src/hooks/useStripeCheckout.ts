import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import type { BillingInterval, PlanType, ProductTierConfig } from '@repo/shared'
import { stripeNotifications, dismissToast } from '@/lib/toast'
import { apiClient } from '@/lib/api-client'

// Initialize Stripe - only if key is available
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
	? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
	: null

export function useStripeCheckout() {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const createCheckoutSession = useCallback(
		async (
			tier: ProductTierConfig,
			billingInterval: BillingInterval,
			planType: PlanType
		) => {
			setLoading(true)
			setError(null)

			// Show loading notification
			const loadingToast =
				planType === 'FREETRIAL'
					? stripeNotifications.custom(
							'Starting your free trial...',
							{
								type: 'info',
								description:
									'Setting up your account with full access to all features.',
								duration: Infinity
							}
						)
					: stripeNotifications.redirectingToCheckout()

			try {
				// Handle free trial differently
				if (planType === 'FREETRIAL') {
					// Start trial notification and redirect to signup
					setTimeout(() => {
						dismissToast(loadingToast)
						stripeNotifications.trialStarted(14)
					}, 1500)

					router.push('/auth/signup')
					return
				}

				// Get the correct price ID based on billing interval
				const priceId =
					billingInterval === 'annual'
						? tier.stripePriceIds.annual
						: tier.stripePriceIds.monthly

				if (!priceId) {
					throw new Error(
						`No price ID found for ${tier.name} ${billingInterval} plan`
					)
				}

				// Call the backend API to create checkout session
				let data
				try {
					data = await apiClient.post('/stripe/create-checkout-session', {
						priceId,
						billingInterval, // Backend requires this field
						mode: 'subscription',
						successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
						cancelUrl: `${window.location.origin}/pricing`,
						allowPromotionCodes: true,
						metadata: {
							planType,
							billingInterval,
							tier: tier.name
						}
					})
				} catch (apiError: unknown) {
					// If it's a 404, the endpoint doesn't exist yet
					const error = apiError as { code?: string; message?: string }
					if (error.code === '404') {
						dismissToast(loadingToast)

						// Show helpful error message
						stripeNotifications.custom(
							'Checkout temporarily unavailable',
							{
								type: 'warning',
								description:
									'Our payment system is being updated. Please contact support to complete your subscription.',
								duration: 8000
							}
						)

						throw new Error(
							'Checkout endpoint not available. Please contact support.'
						)
					}

					throw new Error(
						error.message || 'Failed to create checkout session'
					)
				}

				// According to Stripe docs, prefer using the URL for redirect
				if (data.url) {
					// Show success message before redirect
					dismissToast(loadingToast)
					stripeNotifications.custom(
						'Redirecting to secure checkout...',
						{
							type: 'success',
							description:
								'Taking you to Stripe for secure payment processing.',
							duration: 2000
						}
					)

					// Small delay to show success message
					setTimeout(() => {
						window.location.href = data.url
					}, 800)
				} else if (data.sessionId) {
					if (!stripePromise) {
						throw new Error(
							'Stripe not configured - publishable key missing'
						)
					}
					const stripe = await stripePromise
					if (!stripe) {
						throw new Error('Stripe failed to load')
					}

					dismissToast(loadingToast)
					const { error: stripeError } =
						await stripe.redirectToCheckout({
							sessionId: data.sessionId
						})

					if (stripeError) {
						throw new Error(stripeError.message)
					}
				} else {
					throw new Error(
						'No checkout URL or session ID returned from server'
					)
				}
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: 'Failed to create checkout session'
				logger.error(
					'Checkout error:',
					err instanceof Error ? err : new Error(String(err)),
					{ component: 'UStripeCheckoutHook' }
				)
				setError(message)

				// Dismiss loading and show error
				dismissToast(loadingToast)
				stripeNotifications.paymentFailed(message)

				throw err
			} finally {
				setLoading(false)
			}
		},
		[router]
	)

	const openCustomerPortal = useCallback(async () => {
		setLoading(true)
		setError(null)

		// Show loading notification
		const loadingToast = stripeNotifications.redirectingToPortal()

		try {
			// Call backend to create portal session
			let data
			try {
				data = await apiClient.post('/stripe/create-portal-session', {
					returnUrl: window.location.href
				})
			} catch (apiError: unknown) {
				// If endpoint doesn't exist, show a helpful message
				const error = apiError as { code?: string; message?: string }
				if (error.code === '404') {
					dismissToast(loadingToast)
					stripeNotifications.custom('Billing portal unavailable', {
						type: 'warning',
						description:
							'Please contact support to manage your subscription and billing details.',
						duration: 6000
					})
					throw new Error(
						'Billing portal not available. Please contact support to manage your subscription.'
					)
				}

				throw new Error(
					error.message || 'Failed to open billing portal'
				)
			}

			if (!data.url) {
				throw new Error('No portal URL returned from server')
			}

			// Show success before redirect
			dismissToast(loadingToast)
			stripeNotifications.custom('Opening billing portal...', {
				type: 'success',
				description: 'Redirecting to manage your subscription.',
				duration: 2000
			})

			// Small delay to show success message
			setTimeout(() => {
				window.location.href = data.url
			}, 800)
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: 'Failed to open billing portal'
			logger.error(
				'Portal error:',
				err instanceof Error ? err : new Error(String(err)),
				{ component: 'UStripeCheckoutHook' }
			)
			setError(message)

			// Dismiss loading and show error
			dismissToast(loadingToast)
			stripeNotifications.custom('Portal access failed', {
				type: 'error',
				description: message
			})

			throw err
		} finally {
			setLoading(false)
		}
	}, [])

	return {
		loading,
		error,
		createCheckoutSession,
		openCustomerPortal,
		clearError
	}
}
