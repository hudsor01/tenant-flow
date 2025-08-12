'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { motion, AnimatePresence } from '@/lib/framer-motion'
import { AlertCircle, Star, Users, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { PricingTierCard } from './pricing-tier-card'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { useAuth } from '@/hooks/use-auth'
import { PRODUCT_TIERS, PLAN_TYPE } from '@repo/shared'
import type { BillingInterval, PricingComponentProps, PlanType } from '@repo/shared'
import { createAsyncHandler } from '@/utils/async-handlers'

export function PricingComponent({
  currentPlan,
  customerId,
  onPlanSelect,
  onError,
  className,
}: PricingComponentProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  
  const { user } = useAuth()
  const { 
    loading: checkoutLoading, 
    error: checkoutError, 
    createCheckoutSession, 
    openCustomerPortal,
    clearError 
  } = useStripeCheckout()

  // Clear errors when billing interval changes
  useEffect(() => {
    clearError()
  }, [billingInterval, clearError])

  // Report errors to parent component
  useEffect(() => {
    if (checkoutError && onError) {
      onError({
        type: 'api_error',
        message: checkoutError,
      })
    }
  }, [checkoutError, onError])

  const handlePlanSelect = async (planType: PlanType) => {
    const tierConfig = PRODUCT_TIERS[planType]
    if (!tierConfig) return

    // Clear any existing errors
    clearError()

    // Set loading state for specific plan
    setLoadingPlan(planType)

    try {
      // Call parent callback if provided  
      if (onPlanSelect) {
        onPlanSelect(tierConfig, billingInterval)
      }

      // For FREETRIAL tier, start trial directly
      if (planType === PLAN_TYPE.FREETRIAL) {
        // Redirect to signup/trial flow
        window.location.href = '/auth/signup'
        return
      }

      // Create checkout session for paid plans
      await createCheckoutSession(tierConfig, billingInterval, planType)
    } catch (error) {
      logger.error('Plan selection error:', error instanceof Error ? error : new Error(String(error)), { component: 'components_pricing_pricing_component.tsx' })
    } finally {
      setLoadingPlan(null)
    }
  }

  const handleManageBilling = async () => {
    try {
      await openCustomerPortal()
    } catch (error) {
      logger.error('Portal error:', error instanceof Error ? error : new Error(String(error)), { component: 'components_pricing_pricing_component.tsx' })
    }
  }

  // Get the 4 tiers in display order
  const planTiers = [
    PRODUCT_TIERS[PLAN_TYPE.FREETRIAL],
    PRODUCT_TIERS[PLAN_TYPE.STARTER], 
    PRODUCT_TIERS[PLAN_TYPE.GROWTH],
    PRODUCT_TIERS[PLAN_TYPE.TENANTFLOW_MAX]
  ]

  const recommendedPlan = PRODUCT_TIERS[PLAN_TYPE.GROWTH] // Growth is recommended

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="text-center mb-12">
        <motion.h1 
          className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Choose Your Plan
        </motion.h1>
        
        <motion.p 
          className="text-xl text-gray-600 max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Start with our free trial, then scale as your portfolio grows. 
          All plans include our core property management features.
        </motion.p>

        {/* Trust Indicators */}
        <motion.div
          className="flex items-center justify-center gap-8 text-gray-500 text-sm mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Bank-level Security</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>5-star Support</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Instant Setup</span>
          </div>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          className="flex items-center justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-1 flex items-center">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={cn(
                'px-6 py-2 rounded-md text-sm font-medium transition-all duration-200',
                billingInterval === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={cn(
                'px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 relative',
                billingInterval === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Yearly
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {checkoutError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{checkoutError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Cards */}
      <motion.div 
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        {planTiers.map((tier, index) => {
          const planType = [PLAN_TYPE.FREETRIAL, PLAN_TYPE.STARTER, PLAN_TYPE.GROWTH, PLAN_TYPE.TENANTFLOW_MAX][index] as PlanType
          
          return (
            <motion.div
              key={planType}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
            >
              <PricingTierCard
                tier={tier}
                planType={planType}
                billingInterval={billingInterval}
                isCurrentPlan={currentPlan === planType}
                loading={loadingPlan === planType || checkoutLoading}
                onSubscribe={createAsyncHandler(() => handlePlanSelect(planType), 'Failed to select plan')}
                isRecommended={planType === PLAN_TYPE.GROWTH}
              />
            </motion.div>
          )
        })}
      </motion.div>

      {/* Popular Plan Callout */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="text-center mb-12"
      >
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="w-5 h-5 text-blue-600 fill-current" />
            <span className="text-blue-900 font-semibold text-lg">Most Popular Choice</span>
            <Star className="w-5 h-5 text-blue-600 fill-current" />
          </div>
          <p className="text-gray-700 text-lg mb-6">
            Over 70% of our customers choose the <strong>{recommendedPlan.name} plan</strong> for its 
            perfect balance of features and value.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={createAsyncHandler(() => handlePlanSelect(PLAN_TYPE.GROWTH), 'Failed to select recommended plan')}
              disabled={checkoutLoading || loadingPlan === PLAN_TYPE.GROWTH}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              Try {recommendedPlan.name} Plan
            </Button>
            <Button
              onClick={createAsyncHandler(() => handlePlanSelect(PLAN_TYPE.FREETRIAL), 'Failed to select free trial plan')}
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50 px-8 py-3"
            >
              Start with Free Trial
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Current Subscription Management */}
      {user && customerId && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-center"
        >
          <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
            <Users className="w-8 h-8 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Manage Your Subscription
            </h3>
            <p className="text-gray-600 mb-4">
              Update your billing information, view invoices, or modify your subscription.
            </p>
            <Button
              onClick={createAsyncHandler(handleManageBilling, 'Failed to open billing portal')}
              variant="outline"
              disabled={checkoutLoading}
              className="w-full"
            >
              Open Billing Portal
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}