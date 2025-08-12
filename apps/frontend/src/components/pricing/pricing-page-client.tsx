'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { loadStripe } from '@stripe/stripe-js'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { STRIPE_PUBLISHABLE_KEY } from '@/config/stripe-pricing'
import { logger } from '@/lib/logger'
import { BillingToggle, type BillingInterval } from './billing-toggle'
import { logger } from '@/lib/logger'
import { PricingGrid } from './pricing-grid'
import { logger } from '@/lib/logger'
import { TrustBadges } from './trust-badges'
import { logger } from '@/lib/logger'
import { PricingFAQ } from './pricing-faq'
import { logger } from '@/lib/logger'

// Initialize Stripe
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)

interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  monthlyPriceId: string
  annualPriceId: string
  features: string[]
  iconName: 'Sparkles' | 'Zap' | 'Crown' | 'Rocket'
  popular?: boolean
  propertyLimit: number | 'unlimited'
  unitLimit: number | 'unlimited'
  supportLevel: string
}

interface PricingPageClientProps {
  plans: PricingPlan[]
}

/**
 * Client wrapper for pricing page interactivity
 * Handles state management, auth, and Stripe checkout
 */
export function PricingPageClient({ plans }: PricingPageClientProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  // Fetch current subscription
  useEffect(() => {
    if (user) {
      fetchCurrentSubscription()
    }
  }, [user])

  const fetchCurrentSubscription = async () => {
    try {
      const response = await apiClient.get<{ planType?: string }>('/billing/subscription')
      const data = response.data
      if (data?.planType) {
        setCurrentPlan(data.planType)
      }
    } catch (error) {
      logger.error('Failed to fetch subscription:', error instanceof Error ? error : new Error(String(error)), { component: 'components_pricing_pricing_page_client.tsx' })
    }
  }

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      router.push('/auth/login?redirect=/pricing')
      return
    }

    setLoadingPlan(plan.id)

    try {
      // Create checkout session
      const priceId = billingInterval === 'monthly' ? plan.monthlyPriceId : plan.annualPriceId
      
      const response = await apiClient.post('/billing/create-checkout-session', {
        priceId,
        planType: plan.id,
        billingInterval,
        successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`,
      })

      const data = response.data as { sessionId?: string }
      if (data?.sessionId) {
        // Redirect to Stripe Checkout
        const stripe = await stripePromise
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          })
          
          if (error) {
            toast.error(error.message || 'Failed to redirect to checkout')
          }
        }
      }
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      toast.error(axiosError.response?.data?.message || 'Failed to create checkout session')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <>
      <BillingToggle 
        value={billingInterval}
        onChange={setBillingInterval}
      />
      
      <PricingGrid
        plans={plans}
        billingInterval={billingInterval}
        currentPlan={currentPlan}
        loadingPlan={loadingPlan}
        onPlanSelect={handleSelectPlan}
      />
      
      <TrustBadges />
      
      <PricingFAQ />
    </>
  )
}