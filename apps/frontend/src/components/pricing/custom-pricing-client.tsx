'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BillingToggle, type BillingInterval } from './billing-toggle'
import { PricingGridServer } from './pricing-grid-server'
import { TrustBadges } from './trust-badges-server'
import { StripeFooter } from './stripe-footer'
import type { PricingTier } from './pricing-card-server'

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

/**
 * Client component that manages pricing state and Stripe integration
 * Minimal client logic - most rendering is delegated to server components
 */
export function CustomPricingClient() {
	const [pricing, setPricing] = useState<PricingTier[]>([])
	const [billingInterval, setBillingInterval] =
		useState<BillingInterval>('monthly')
	const [loading, setLoading] = useState(true)
	const [processingPlan, setProcessingPlan] = useState<string | null>(null)
	const { user } = useAuth()
	const router = useRouter()

	useEffect(() => {
		fetchPricing()
	}, [])

	const fetchPricing = async () => {
		try {
			const response = await fetch('/api/stripe/setup-pricing')
			const data = await response.json()

			// Sort by order metadata
			const sortedProducts = data.products.sort(
				(a: PricingTier, b: PricingTier) =>
					parseInt(a.product.metadata.order) -
					parseInt(b.product.metadata.order)
			)

			setPricing(sortedProducts)
		} catch (error) {
			logger.error(
				'Failed to fetch pricing:',
				error instanceof Error ? error : new Error(String(error)),
				{ component: 'components_pricing_custom_pricing_client.tsx' }
			)
			toast.error('Failed to load pricing. Please refresh the page.')
		} finally {
			setLoading(false)
		}
	}

	const handleSelectPlan = async (priceId: string, productName: string) => {
		if (!user && productName !== 'Free Trial') {
			router.push('/auth/login?redirect=/pricing-custom')
			return
		}

		setProcessingPlan(priceId)

		try {
			const response = await apiClient.post(
				'/billing/create-checkout-session',
				{
					priceId,
					successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
					cancelUrl: `${window.location.origin}/pricing-custom`,
					metadata: {
						source: 'custom_pricing_page'
					}
				}
			)

			const data = response.data as { sessionId?: string }
			if (data?.sessionId) {
				const stripe = await stripePromise
				if (stripe) {
					const { error } = await stripe.redirectToCheckout({
						sessionId: data.sessionId
					})

					if (error) {
						toast.error(
							error.message || 'Failed to redirect to checkout'
						)
					}
				}
			}
		} catch (error) {
			const axiosError = error as {
				response?: { data?: { message?: string } }
			}
			toast.error(
				axiosError.response?.data?.message ||
					'Failed to create checkout session'
			)
		} finally {
			setProcessingPlan(null)
		}
	}

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
					<p className="text-muted-foreground text-lg">
						Loading pricing...
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
			<div className="container mx-auto max-w-7xl px-4 py-16">
				{/* Header */}
				<div className="mb-12 text-center">
					<Badge className="mb-4" variant="secondary">
						POWERED BY STRIPE
					</Badge>
					<h1 className="from-primary to-primary/60 mb-4 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent md:text-5xl lg:text-6xl">
						Choose Your Growth Plan
					</h1>
					<p className="text-muted-foreground mx-auto max-w-2xl text-xl">
						Start free, scale as you grow. Switch plans anytime with
						instant updates.
					</p>
				</div>

				{/* Billing Toggle */}
				<BillingToggle
					value={billingInterval}
					onChange={setBillingInterval}
				/>

				{/* Pricing Cards */}
				<PricingGridServer
					pricing={pricing}
					billingInterval={billingInterval}
					processingPlan={processingPlan}
					onSelectPlan={handleSelectPlan}
				/>

				{/* Trust Indicators */}
				<TrustBadges />

				{/* Powered by Stripe */}
				<StripeFooter />
			</div>
		</div>
	)
}
