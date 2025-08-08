'use client'

import { useActionState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, Shield } from 'lucide-react'
import { createCheckoutSession } from '@/lib/actions/billing-actions'
import type { BillingFormState } from '@/lib/actions/billing-actions'

interface CheckoutFormProps {
  priceId: string
  planName: string
  amount: number
  interval: 'month' | 'year'
  trialDays?: number
  couponId?: string
  className?: string
}

const initialState: BillingFormState = {
  errors: {},
  success: false
}

/**
 * Client Component - CheckoutForm
 * Uses server actions for secure checkout session creation
 */
export function CheckoutForm({
  priceId,
  planName,
  amount,
  interval,
  trialDays,
  couponId,
  className
}: CheckoutFormProps) {
  const [state, formAction, isPending] = useActionState(
    createCheckoutSession,
    initialState
  )

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <CreditCard className="h-5 w-5" />
          Subscribe to {planName}
        </CardTitle>
        <CardDescription>
          <span className="text-lg font-semibold">
            ${(amount / 100).toFixed(2)}/{interval}
          </span>
          {trialDays && (
            <>
              <br />
              <span className="text-green-600 font-medium">
                {trialDays}-day free trial
              </span>
            </>
          )}
          <br />
          Secure checkout powered by Stripe
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-6">
          {/* Hidden form fields */}
          <input type="hidden" name="priceId" value={priceId} />
          {trialDays && (
            <input type="hidden" name="trialPeriodDays" value={trialDays} />
          )}
          {couponId && (
            <input type="hidden" name="couponId" value={couponId} />
          )}
          <input 
            type="hidden" 
            name="successUrl" 
            value={`${window.location.origin}/billing/success`} 
          />
          <input 
            type="hidden" 
            name="cancelUrl" 
            value={`${window.location.origin}/billing/cancel`} 
          />

          {/* Error messages */}
          {state.errors?._form && (
            <Alert variant="destructive">
              <AlertDescription>
                {state.errors._form.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {state.success && (
            <Alert>
              <AlertDescription>
                Redirecting to checkout...
              </AlertDescription>
            </Alert>
          )}

          {/* Action button */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Checkout...
              </>
            ) : (
              <>
                Subscribe for ${(amount / 100).toFixed(2)}/{interval}
                {trialDays && ' - Start Free Trial'}
              </>
            )}
          </Button>

          {/* Security notice */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secured by 256-bit SSL encryption</span>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Simplified Checkout Button - for inline use
 */
interface CheckoutButtonProps {
  priceId: string
  planName: string
  _amount: number
  _interval: 'month' | 'year'
  trialDays?: number
  couponId?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function CheckoutButton({
  priceId,
  planName,
  _amount,
  _interval,
  trialDays,
  couponId,
  variant = 'default',
  size = 'default',
  className,
  children
}: CheckoutButtonProps) {
  const [state, formAction, isPending] = useActionState(
    createCheckoutSession,
    initialState
  )

  return (
    <form action={formAction} className="w-full">
      {/* Hidden form fields */}
      <input type="hidden" name="priceId" value={priceId} />
      {trialDays && (
        <input type="hidden" name="trialPeriodDays" value={trialDays} />
      )}
      {couponId && (
        <input type="hidden" name="couponId" value={couponId} />
      )}
      <input 
        type="hidden" 
        name="successUrl" 
        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/billing/success`} 
      />
      <input 
        type="hidden" 
        name="cancelUrl" 
        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/billing/cancel`} 
      />

      <Button
        type="submit"
        disabled={isPending}
        variant={variant}
        size={size}
        className={className}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          children || `Subscribe to ${planName}`
        )}
      </Button>

      {/* Show errors inline if any */}
      {state.errors?._form && (
        <p className="text-sm text-destructive mt-2">
          {state.errors._form.join(', ')}
        </p>
      )}
    </form>
  )
}