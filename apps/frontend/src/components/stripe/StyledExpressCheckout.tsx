import { ExpressCheckoutElement } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { 
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent
} from '@stripe/stripe-js'

interface StyledExpressCheckoutProps {
  onSuccess?: () => void
  /**
   * Height of the Express Checkout Element
   */
  height?: number
  /**
   * Show wallet buttons like Apple Pay and Google Pay
   */
  showWallets?: boolean
}

/**
 * StyledExpressCheckout Component
 * 
 * Displays one-click payment buttons (Apple Pay, Google Pay, Link, PayPal)
 * with styling that matches our modern masculine theme.
 * 
 * Features:
 * - Dynamic button sorting based on customer location
 * - Automatic wallet detection
 * - Responsive layout
 * - Styled to match our design system
 * 
 * @example
 * ```tsx
 * <StripeProvider>
 *   <StyledExpressCheckout 
 *     onSuccess={() => router.push('/success')}
 *   />
 * </StripeProvider>
 * ```
 */
export function StyledExpressCheckout({ 
  onSuccess,
  height = 50,
  showWallets = true
}: StyledExpressCheckoutProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleClick = (event: StripeExpressCheckoutElementClickEvent) => {
    // Resolve the payment when the customer clicks the Express Checkout button
    event.resolve({
      // Additional options can be passed here
    })
  }

  const handleConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    // Handle the payment confirmation
    // Note: The confirm method is not on the event itself in this context
    // The event contains payment details and callbacks
    if (!event.billingDetails) {
      event.paymentFailed({ reason: 'invalid_payment_data' })
      setErrorMessage('Payment failed - invalid payment data')
    } else {
      onSuccess?.()
    }
  }

  const handleCancel = () => {
    // Handle when customer cancels the payment
    setErrorMessage(null)
  }

  const handleReady = (event: StripeExpressCheckoutElementReadyEvent) => {
    // The Express Checkout Element is ready
    console.log('Express Checkout ready:', event.availablePaymentMethods)
  }

  return (
    <div className="space-y-4">
      {/* Express checkout buttons container */}
      <div className="rounded-xl border border-border bg-gradient-subtle p-4">
        <ExpressCheckoutElement
          onReady={handleReady}
          onClick={handleClick}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          options={{
            // Layout options
            layout: {
              maxColumns: 2,
              maxRows: 1,
              overflow: 'auto'
            },
            // Button customization
            buttonHeight: height,
            // Wallet options
            wallets: showWallets ? {
              applePay: 'auto',
              googlePay: 'auto'
            } : {
              applePay: 'never',
              googlePay: 'never'
            },
            // Payment method options
            paymentMethods: {
              link: 'auto',
              paypal: 'auto',
              applePay: showWallets ? 'auto' : 'never',
              googlePay: showWallets ? 'auto' : 'never',
              amazonPay: 'auto',
              klarna: 'auto'
            }
          }}
        />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or pay with card
          </span>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}