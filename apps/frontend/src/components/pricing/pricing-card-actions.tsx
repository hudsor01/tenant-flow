'use client'

import { Button } from '@/components/ui/button'
import { ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PricingTier } from './pricing-card-server'

interface PricingCardActionsProps {
  tier: PricingTier
  price?: PricingTier['prices'][0]
  isPopular: boolean
  isProcessing: boolean
  onSelectPlan?: (priceId: string, productName: string) => void
}

/**
 * Client component for pricing card actions
 * Handles interactive button state and click events
 */
export function PricingCardActions({ 
  tier, 
  price, 
  isPopular, 
  isProcessing,
  onSelectPlan 
}: PricingCardActionsProps) {
  const handleClick = () => {
    if (price && onSelectPlan) {
      onSelectPlan(price.id, tier.product.name)
    }
  }

  const isProcessingThisCard = isProcessing && price?.id
  const isDisabled = !price || isProcessing

  return (
    <Button
      className={cn(
        'w-full group',
        isPopular && 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
      )}
      size="lg"
      variant={isPopular ? 'default' : 'outline'}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {isProcessingThisCard ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : tier.product.metadata.tier === 'free_trial' ? (
        <>
          Start Free Trial
          <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </>
      ) : (
        <>
          Get Started
          <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </>
      )}
    </Button>
  )
}