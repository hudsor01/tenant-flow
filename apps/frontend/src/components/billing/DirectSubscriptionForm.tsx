import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, AlertCircle } from 'lucide-react'
import { useDirectSubscription } from '@/hooks/useDirectSubscription'
import type { PLAN_TYPE } from '@tenantflow/shared/types/billing'

interface DirectSubscriptionFormProps {
  priceId: string
  planType: keyof typeof PLAN_TYPE
  planName: string
  price: number
  interval: 'month' | 'year'
  onSuccess?: (subscriptionId: string) => void
  onCancel?: () => void
}

/**
 * Direct subscription form component
 * Implements the pattern from: https://github.com/stripe-samples/subscription-use-cases
 * 
 * This provides a more integrated checkout experience compared to Stripe Checkout.
 */
export function DirectSubscriptionForm({
  priceId,
  planType,
  planName,
  price,
  interval,
  onSuccess,
  onCancel
}: DirectSubscriptionFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { createDirectSubscription, isProcessing, error } = useDirectSubscription()
  
  const [billingName, setBillingName] = useState('')
  const [cardError, setCardError] = useState<string | null>(null)
  const [isCardComplete, setIsCardComplete] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements || !isCardComplete) {
      return
    }

    const result = await createDirectSubscription({
      priceId,
      planType,
      billingName
    })

    if (result.success && result.subscriptionId) {
      onSuccess?.(result.subscriptionId)
    }
  }

  const handleCardChange = (event: { error?: { message: string }, complete: boolean }) => {
    setCardError(event.error ? event.error.message : null)
    setIsCardComplete(event.complete)
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      invalid: {
        color: '#9e2146',
        iconColor: '#9e2146'
      },
    },
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscribe to {planName}
        </CardTitle>
        <CardDescription>
          ${price}/{interval} • Cancel anytime
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Billing Name */}
          <div className="space-y-2">
            <Label htmlFor="billing-name">Billing Name</Label>
            <Input
              id="billing-name"
              type="text"
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              placeholder="Jane Doe"
              required
              disabled={isProcessing}
            />
          </div>

          {/* Card Element */}
          <div className="space-y-2">
            <Label htmlFor="card-element">Card Information</Label>
            <div className="p-3 border rounded-md">
              <CardElement
                id="card-element"
                options={cardElementOptions}
                onChange={handleCardChange}
              />
            </div>
            {cardError && (
              <p className="text-sm text-destructive">{cardError}</p>
            )}
          </div>

          {/* Test Cards */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Test mode:</strong> Use card number 4242 4242 4242 4242 with any future expiry date, any CVC, and any postal code.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!stripe || isProcessing || !isCardComplete || !billingName}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Start Subscription</>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center">
            By subscribing, you agree to our terms of service and privacy policy.
            You can cancel your subscription at any time.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}