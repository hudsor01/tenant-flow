import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

interface StyledPaymentElementProps {
  clientSecret: string
  onSuccess?: () => void
  /**
   * Customize the layout of payment methods
   */
  layout?: 'tabs' | 'accordion'
  /**
   * Show or hide the terms text
   */
  showTerms?: boolean
}

/**
 * StyledPaymentElement Component
 * 
 * A styled implementation of Stripe's Payment Element
 * that matches our modern masculine theme.
 * 
 * Features:
 * - Fully styled payment form matching our design system
 * - Support for 40+ payment methods
 * - Built-in validation and error handling
 * - Responsive design
 * 
 * @example
 * ```tsx
 * <StripeProvider>
 *   <StyledPaymentElement 
 *     clientSecret={clientSecret}
 *     onSuccess={() => router.push('/success')}
 *   />
 * </StripeProvider>
 * ```
 */
export function StyledPaymentElement({ 
  clientSecret: _clientSecret,
  onSuccess,
  layout = 'tabs',
  showTerms = true
}: StyledPaymentElementProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    // Confirm the payment
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL for redirect-based payment methods
        return_url: `${window.location.origin}/payment/complete`,
      },
      // Prevent redirect for card payments
      redirect: 'if_required'
    })

    if (error) {
      // Show error to customer
      setErrorMessage(error.message || 'An unexpected error occurred.')
      setIsProcessing(false)
    } else {
      // Payment succeeded
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element with custom styling */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <PaymentElement
          options={{
            layout: {
              type: layout as 'accordion' | 'tabs',
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
            terms: showTerms ? {
              card: 'auto',
              applePay: 'auto',
              googlePay: 'auto'
            } : undefined,
            wallets: {
              applePay: 'auto',
              googlePay: 'auto'
            },
            // Business information
            business: {
              name: 'TenantFlow'
            },
            // Payment method order (most relevant first)
            paymentMethodOrder: [
              'card',
              'apple_pay',
              'google_pay',
              'link',
              'paypal',
              'klarna',
              'afterpay_clearpay',
              'affirm'
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

      {/* Submit button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-steel-soft hover:bg-gradient-steel-deep text-white shadow-lg hover:shadow-xl transition-all duration-300"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Pay Now'
        )}
      </Button>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Secure payment powered by Stripe</span>
      </div>
    </form>
  )
}