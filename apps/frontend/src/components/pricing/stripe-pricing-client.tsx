'use client'

import { useAuth } from '@/hooks/use-auth'
import { StripePricingTable } from '@/components/billing/stripe-pricing-table'
import { FeatureComparisonTable } from './feature-comparison-table'
import { PricingFAQServer } from './pricing-faq-server'
import { TrustBadges } from './trust-badges-server'

/**
 * Client component for Stripe Pricing Page
 * Handles user authentication and integrates with Stripe pricing table
 */
export function StripePricingClient() {
	const { user } = useAuth()

	return (
		<div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
			<div className="container mx-auto px-4 py-16">
				{/* Header */}
				<div className="mb-12 text-center">
					<h1 className="mb-4 text-4xl font-bold md:text-5xl">
						Simple, Transparent Pricing
					</h1>
					<p className="text-muted-foreground mx-auto max-w-2xl text-xl">
						Choose the plan that fits your portfolio. All plans
						include our core features with different limits.
					</p>
				</div>

				{/* Stripe Pricing Table */}
				<div className="mx-auto mb-16 max-w-6xl">
					<StripePricingTable customerEmail={user?.email} />
				</div>

				{/* Feature Comparison */}
				<FeatureComparisonTable />

				{/* Trust Badges */}
				<TrustBadges className="mt-16" />

				{/* FAQ Section */}
				<PricingFAQServer />
			</div>
		</div>
	)
}
