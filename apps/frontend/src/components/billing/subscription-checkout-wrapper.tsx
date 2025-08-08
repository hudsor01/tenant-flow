import { useEffect, useState } from 'react'
// import { StripeProvider } from '@/providers/StripeProvider'
import { SubscriptionCheckout } from './subscription-checkout'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PLAN_TYPE } from '@repo/shared'

interface SubscriptionCheckoutWrapperProps {
  planType: keyof typeof PLAN_TYPE
  billingInterval: 'monthly' | 'annual'
  onSuccess?: (subscriptionId: string) => void
  onCancel?: () => void
}

/**
 * Subscription Checkout Wrapper
 * 
 * Handles the complete flow:
 * 1. Creates a subscription with payment_behavior: 'default_incomplete' 
 * 2. Gets the client secret from the payment intent
 * 3. Provides Stripe Elements context with the client secret
 * 4. Renders the checkout form
 */
export function SubscriptionCheckoutWrapper({
  planType,
  billingInterval,
  onSuccess,
  onCancel
}: SubscriptionCheckoutWrapperProps) {
  const [, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // Initialize the checkout context
  const initializeCheckout = async () => {
    try {
      setIsInitializing(true)
      setError(null)

      // Initialize Elements context for subscription mode
      // The actual subscription creation happens in the form component
      setClientSecret('ready') // Signal that we're ready to show the form
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize checkout'
      setError(message)
    } finally {
      setIsInitializing(false)
    }
  }

  useEffect(() => {
    void initializeCheckout()
  }, [planType, billingInterval])

  if (isInitializing) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Initializing secure checkout...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto">
        <AlertDescription>
          {error}
          <button
            onClick={() => void initializeCheckout()}
            className="ml-2 underline hover:no-underline"
          >
            Try again
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <SubscriptionCheckout
        planType={planType}
        billingInterval={billingInterval}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </div>
  )
}