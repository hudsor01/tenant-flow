import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard } from 'lucide-react'
import { useCheckout } from '@/hooks/useCheckout'
import type { PLAN_TYPE } from '@tenantflow/shared'
import { getPlanWithUIMapping } from '@/lib/subscription-utils'

interface SubscriptionCheckoutProps {
  planType: keyof typeof PLAN_TYPE
  billingInterval: 'monthly' | 'annual'
  onSuccess?: (subscriptionId: string) => void
  onCancel?: () => void
}

/**
 * Integrated Subscription Checkout Component
 * 
 * Combines your styled PaymentElement with direct subscription creation.
 * Uses the official Stripe pattern: create subscription with payment_behavior: 'default_incomplete'
 * then confirm payment with Elements.
 */
export function SubscriptionCheckout({
  planType,
  billingInterval,
  onSuccess,
  onCancel
}: SubscriptionCheckoutProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { createSubscription, isLoading } = useCheckout()
  
  const [billingName, setBillingName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Get plan details for display
  const plan = getPlanWithUIMapping(planType)
  const price = billingInterval === 'annual' ? plan?.price.annual : plan?.price.monthly

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      setErrorMessage('Stripe has not loaded yet. Please try again.')
      return
    }

    if (!billingName.trim()) {
      setErrorMessage('Please enter your billing name.')
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      // Create subscription and confirm payment
      const result = await createSubscription({
        planType,
        billingInterval,
        billingName: billingName.trim()
      })

      if (result.success && result.subscriptionId) {
        onSuccess?.(result.subscriptionId)
      } else {
        setErrorMessage(result.error || 'Failed to create subscription')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      setErrorMessage(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <CreditCard className="h-5 w-5" />
          Subscribe to {plan?.name}
        </CardTitle>
        <CardDescription>
          {price && (
            <span className="text-lg font-semibold">
              ${price}/{billingInterval === 'annual' ? 'year' : 'month'}
            </span>
          )}
          <br />
          Secure checkout powered by Stripe
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Billing Name Input */}
          <div className="space-y-2">
            <Label htmlFor="billingName">Billing Name</Label>
            <Input
              id="billingName"
              type="text"
              placeholder="Enter your full name"
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              disabled={isProcessing || isLoading}
              required
            />
          </div>

          {/* Payment Element with your styling */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <PaymentElement
              options={{
                layout: {
                  type: 'tabs',
                  defaultCollapsed: false,
                  spacedAccordionItems: true
                },
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'never',
                    address: {
                      country: 'auto',
                      postalCode: 'auto'
                    }
                  }
                },
                terms: {
                  card: 'auto',
                  applePay: 'auto',
                  googlePay: 'auto'
                },
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto'
                },
                business: {
                  name: 'TenantFlow'
                },
                paymentMethodOrder: [
                  'card',
                  'apple_pay',
                  'google_pay',
                  'link',
                  'paypal'
                ]
              }}
            />
          </div>

          {/* Error message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing || isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={!stripe || isProcessing || isLoading}
              className="flex-1 bg-gradient-steel-soft hover:bg-gradient-steel-deep text-white shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              {isProcessing || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Subscribe for $${price}/${billingInterval === 'annual' ? 'year' : 'month'}`
              )}
            </Button>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>256-bit SSL encryption</span>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
