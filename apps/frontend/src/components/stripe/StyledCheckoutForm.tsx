import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

interface StyledCheckoutFormProps {
  clientSecret: string
  onSuccess?: () => void
  onError?: (error: string) => void
  returnUrl?: string
}

/**
 * StyledCheckoutForm Component
 * 
 * Official Stripe Embedded Checkout implementation following Stripe's best practices.
 * This component uses Stripe's EmbeddedCheckout for secure, PCI-compliant payment processing.
 * 
 * Features:
 * - Official Stripe Embedded Checkout
 * - Automatic payment method detection
 * - Built-in address collection
 * - Mobile-optimized responsive design
 * - Full PCI compliance
 * - Integrated with TenantFlow's design system
 * 
 * @example
 * ```tsx
 * <StyledCheckoutForm 
 *   clientSecret="cs_1234567890"
 *   returnUrl="/dashboard?subscription=success"
 *   onSuccess={() => console.log('Payment completed')}
 * />
 * ```
 */
export function StyledCheckoutForm({ 
  clientSecret,
  onSuccess,
  onError,
  returnUrl = `${window.location.origin}/dashboard?subscription=success`
}: StyledCheckoutFormProps) {
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!)

  const options = {
    clientSecret,
    onComplete: () => {
      onSuccess?.()
    }
  }

  return (
    <div className="w-full">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={options}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}

