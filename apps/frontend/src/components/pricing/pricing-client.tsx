'use client'

import React from 'react'
import { PricingProvider, usePricingContext } from '@/contexts/pricing-context'
import { PricingTable } from './pricing-table'
import { UsageIndicator } from './usage-indicator'
import { PricingRecommendations } from './pricing-recommendations'
import { PricingHeader } from './pricing-header'
import { PricingFAQ } from './pricing-faq'
import { SecurityBadges } from './security-badges'
import { CustomerTestimonials } from './customer-testimonials'
import { useAuth } from '@/hooks/use-auth'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { logger } from '@/lib/logger'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { PlanType } from '@repo/shared'

export interface PricingClientProps {
  className?: string
}

/**
 * Inner pricing client that uses the pricing context
 */
function PricingClientContent({ className }: PricingClientProps) {
  const { user, isAuthenticated } = useAuth()
  const { currentPlan, subscription, isLoading, error } = usePricingContext()
  const { createCheckoutSession } = useStripeCheckout()

  const handlePlanSelect = async (planType: PlanType) => {
    if (!isAuthenticated) {
      logger.info('User not authenticated, redirecting to signup', { planType })
      window.location.href = `/signup?plan=${planType}`
      return
    }

    try {
      logger.info('Initiating checkout for plan', { planType, userId: user?.id })
      await createCheckoutSession(
        { price: { monthly: 0, annual: 0 } } as unknown as Parameters<typeof createCheckoutSession>[0],
        'monthly',
        planType
      )
    } catch (error) {
      logger.error('Checkout failed', { error, planType })
    }
  }

  // Show loading skeleton while data is loading
  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-white ${className || ''}`} data-testid="pricing-client-loading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-32 w-full mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-white ${className || ''}`} data-testid="pricing-client-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <PricingHeader />
        
        {/* Display error if pricing data failed to load */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load live pricing data. Showing Stripe pricing table.
            </AlertDescription>
          </Alert>
        )}

        {/* User-specific recommendations and usage (only for authenticated users) */}
        {isAuthenticated && currentPlan && (
          <div className="space-y-6 mb-12">
            {/* Usage indicator for users with active subscriptions */}
            {subscription ? <UsageIndicator /> : null}
            
            {/* Smart recommendations */}
            <PricingRecommendations onSelectPlan={handlePlanSelect} />
          </div>
        )}
        
        {/* Stripe Pricing Table */}
        <div className="mb-12">
          <PricingTable 
            customerEmail={user?.email}
            className="w-full"
          />
        </div>
        
        {/* Additional sections */}
        <div className="space-y-16">
          {/* Security and trust indicators */}
          <SecurityBadges />
          
          {/* Customer testimonials */}
          <CustomerTestimonials />
          
          {/* FAQ section */}
          <PricingFAQ />
        </div>
      </div>
    </div>
  )
}

/**
 * Main pricing page client component with context provider
 * Combines Stripe pricing table with personalized recommendations and usage tracking
 */
export function PricingClient(props: PricingClientProps) {
  return (
    <PricingProvider>
      <PricingClientContent {...props} />
    </PricingProvider>
  )
}