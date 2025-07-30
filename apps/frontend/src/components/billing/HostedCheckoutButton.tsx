import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useBilling } from '@/hooks/useBilling'
import type { PlanType } from '@tenantflow/shared/types/billing'

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
  successUrl,
  cancelUrl,
  couponId
}: HostedCheckoutButtonProps) {
  const { createCheckoutSession, isCreatingCheckout } = useBilling()

  const handleClick = async () => {
    try {
      await createCheckoutSession({
        planType,
        billingInterval,
        successUrl: successUrl || `${window.location.origin}/billing/success`,
        cancelUrl: cancelUrl || `${window.location.origin}/billing/cancel`,
        couponId
      })
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isCreatingCheckout}
      className={className}
    >
      {isCreatingCheckout ? (
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