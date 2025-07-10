import { useState, type FormEvent } from 'react'
import { 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface CheckoutFormProps {
  planId: string
  planName?: string
  onSuccess?: () => void
  returnUrl?: string
}

export function CheckoutForm({ 
  planId, 
  planName = 'Subscription',
  onSuccess,
  returnUrl 
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { getToken } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setErrorMessage('Stripe has not loaded yet. Please try again.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Submit form and validate
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setErrorMessage(submitError.message || 'Please check your payment information')
        setIsLoading(false)
        return
      }

      // Create subscription on server using NestJS backend
      const accessToken = getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          planId,
          // Add additional data as needed
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create subscription')
      }

      const { clientSecret, error: serverError } = await response.json()
      
      if (serverError) {
        setErrorMessage(serverError)
        setIsLoading(false)
        return
      }

      if (!clientSecret) {
        setErrorMessage('Invalid response from server')
        setIsLoading(false)
        return
      }

      // Confirm payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/billing/success`,
        },
      })

      if (confirmError) {
        setErrorMessage(confirmError.message || 'Payment confirmation failed')
      } else {
        // Payment successful - user will be redirected
        onSuccess?.()
      }

    } catch (error) {
      console.error('Checkout error:', error)
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = !stripe || isLoading

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Subscription</CardTitle>
        <CardDescription>
          Subscribe to {planName} and start managing your properties today
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <PaymentElement 
              options={{
                layout: 'accordion', // Updated to match new default
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto',
                },
                terms: {
                  card: 'auto',
                },
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'auto',
                    address: {
                      country: 'auto',
                      line1: 'auto',
                      line2: 'auto',
                      city: 'auto',
                      state: 'auto',
                      postalCode: 'auto',
                    },
                  },
                },
                // Enable automatic payment method ordering
                paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
              }}
            />
          </div>
          
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            disabled={isDisabled}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Subscribe Now'
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Your payment is secured by Stripe. You can cancel anytime from your billing portal.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}