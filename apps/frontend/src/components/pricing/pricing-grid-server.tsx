import { PricingCardServer, type PricingTier } from './pricing-card-server'
import type { BillingInterval } from './billing-toggle'

interface PricingGridServerProps {
  pricing: PricingTier[]
  billingInterval: BillingInterval
  processingPlan?: string | null
  onSelectPlan?: (priceId: string, productName: string) => void
}

/**
 * Server component for pricing grid
 * Renders static pricing cards with client islands for actions
 */
export function PricingGridServer({ 
  pricing, 
  billingInterval, 
  processingPlan,
  onSelectPlan 
}: PricingGridServerProps) {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {pricing.map((tier) => (
        <PricingCardServer
          key={tier.product.id}
          tier={tier}
          billingInterval={billingInterval}
          isProcessing={processingPlan !== null}
          onSelectPlan={onSelectPlan}
        />
      ))}
    </div>
  )
}