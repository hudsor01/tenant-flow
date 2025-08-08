import { PricingPlanCard } from './pricing-plan-card'
import type { BillingInterval } from './billing-toggle'

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

interface PricingGridProps {
  plans: PricingPlan[]
  billingInterval: BillingInterval
  currentPlan: string | null
  loadingPlan: string | null
  onPlanSelect: (plan: PricingPlan) => void
  className?: string
}

/**
 * Server component for pricing grid layout
 * Contains client components but is itself server-rendered
 */
export function PricingGrid({
  plans,
  billingInterval,
  currentPlan,
  loadingPlan,
  onPlanSelect,
  className
}: PricingGridProps) {
  return (
    <div className={`grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto ${className || ''}`}>
      {plans.map((plan) => (
        <PricingPlanCard
          key={plan.id}
          plan={plan}
          billingInterval={billingInterval}
          isCurrentPlan={currentPlan === plan.id}
          isLoading={loadingPlan === plan.id}
          onSelect={onPlanSelect}
        />
      ))}
    </div>
  )
}