import { useState, type FormEvent } from 'react'
import { 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, CreditCard, Calendar } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface FreeTrialCheckoutProps {
  planName?: string
  onSuccess?: () => void
  onSkipPaymentMethod?: () => void
  returnUrl?: string
  requirePaymentMethod?: boolean
}

export function FreeTrialCheckout({ 
  planName: _planName = 'Free Trial',
  onSuccess,
  onSkipPaymentMethod,
  returnUrl,
  requirePaymentMethod = false
}: FreeTrialCheckoutProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { getToken } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paymentMethodCollectionMode, setPaymentMethodCollectionMode] = useState<'required' | 'optional'>('optional')

  const handleSubmitWithPayment = async (event: FormEvent) => {
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

      // Create subscription with trial using NestJS backend
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
          planId: 'freeTrial',
          billingPeriod: 'monthly',
          paymentMethodCollection: 'always'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start trial')
      }

      const { clientSecret } = await response.json()
      
      if (clientSecret) {
        // Confirm setup intent for payment method collection
        const { error: confirmError } = await stripe.confirmSetup({
          elements,
          clientSecret,
          confirmParams: {
            return_url: returnUrl || `${window.location.origin}/dashboard?trial=started`,
          },
        })

        if (confirmError) {
          setErrorMessage(confirmError.message || 'Failed to save payment method')
        } else {
          onSuccess?.()
        }
      } else {
        // Trial started without payment method
        onSuccess?.()
      }

    } catch (error) {
      console.error('Trial signup error:', error)
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Failed to start your trial'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipPaymentMethod = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Create subscription without payment method collection using NestJS backend
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
          planId: 'freeTrial',
          billingPeriod: 'monthly',
          paymentMethodCollection: 'if_required'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start trial')
      }

      onSkipPaymentMethod?.()
    } catch (error) {
      console.error('Trial signup error:', error)
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Failed to start your trial'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = !stripe || isLoading

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Badge variant="secondary" className="text-sm font-medium">
            <Calendar className="w-4 h-4 mr-1" />
            14-Day Free Trial
          </Badge>
        </div>
        <CardTitle className="text-2xl">Start Your Free Trial</CardTitle>
        <CardDescription className="text-base">
          Get full access to TenantFlow for 14 days. No charges until your trial ends.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Trial Benefits */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">What's included in your trial:</h4>
          <ul className="space-y-1 text-sm text-green-800">
            <li className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Up to 3 properties
            </li>
            <li className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Unlimited tenant management
            </li>
            <li className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Basic reporting & analytics
            </li>
            <li className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Email support
            </li>
          </ul>
        </div>

        {/* Payment Method Section */}
        {!requirePaymentMethod && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Payment Method</h4>
              <div className="flex gap-2">
                <Button
                  variant={paymentMethodCollectionMode === 'required' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethodCollectionMode('required')}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Add Now
                </Button>
                <Button
                  variant={paymentMethodCollectionMode === 'optional' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethodCollectionMode('optional')}
                >
                  Skip
                </Button>
              </div>
            </div>
            
            <Alert>
              <AlertDescription>
                {paymentMethodCollectionMode === 'required' 
                  ? "We'll save your payment method but won't charge until your trial ends."
                  : "You can add a payment method later to continue after your trial ends."
                }
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Payment Form or Skip Option */}
        {(requirePaymentMethod || paymentMethodCollectionMode === 'required') ? (
          <form onSubmit={handleSubmitWithPayment} className="space-y-6">
            <div className="space-y-4">
              <PaymentElement 
                options={{
                  layout: 'accordion',
                  wallets: {
                    applePay: 'auto',
                    googlePay: 'auto',
                  },
                  fields: {
                    billingDetails: {
                      name: 'auto',
                      email: 'auto',
                      address: 'auto',
                    },
                  },
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
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Your Trial...
                </>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleSkipPaymentMethod}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Your Trial...
                </>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </div>
        )}
        
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>Cancel anytime during your trial to avoid charges.</p>
          <p>After your trial, you'll be charged $29/month unless cancelled.</p>
        </div>
      </CardContent>
    </Card>
  )
}