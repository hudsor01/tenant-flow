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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your portfolio. All plans include our core features with different limits.
          </p>
        </div>

        {/* Stripe Pricing Table */}
        <div className="max-w-6xl mx-auto mb-16">
          <StripePricingTable 
            customerEmail={user?.email}
          />
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