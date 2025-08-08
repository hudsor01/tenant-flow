import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useBilling } from '@/hooks/useBilling'
import type { PlanType } from '@repo/shared'

interface HostedCheckoutButtonProps {
  planType: PlanType
  billingInterval: 'monthly' | 'annual'
  className?: string
  children?: React.ReactNode
  successUrl?: string
  cancelUrl?: string
  couponId?: string
}

/**
 * Checkout button that redirects to Stripe's hosted checkout page
 * This is the simplest and most secure way to handle payments
 */
export function HostedCheckoutButton({ 
  planType, 
  billingInterval, 
  className,
  children = 'Subscribe',
  successUrl: _successUrl,
  cancelUrl: _cancelUrl,
  couponId: _couponId
}: HostedCheckoutButtonProps) {
  const { createCheckoutSession, isLoading } = useBilling()

  const handleClick = async () => {
    try {
      // The useBilling hook expects priceId, we'll need to map planType to priceId
      // For now, using a placeholder - this should be replaced with actual price IDs
      const priceId = `price_${planType}_${billingInterval}`
      await createCheckoutSession(priceId, planType, billingInterval)
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <Button
      onClick={() => void handleClick()}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading checkout...
        </>
      ) : (
        children
      )}
    </Button>
  )
}