'use client'

import { Card, CardContent } from '#components/ui/card'
import { CreditCard, Loader2 } from 'lucide-react'
import { createClient } from '#utils/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'PaymentMethodDisplay' })

interface PaymentMethod {
  id: string
  type: string
  brand: string | null
  last_four: string | null
  exp_month: number | null
  exp_year: number | null
}

/**
 * Payment Method Display Component
 *
 * Shows user's current payment methods from Stripe
 * Read-only display - users manage via Stripe Customer Portal
 *
 * RLS Security:
 * - Users can only see their own payment methods
 * - Enforced by stripe.payment_methods RLS policy
 */
export function PaymentMethodDisplay() {
  const supabase = createClient()

  const { data: paymentMethods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      logger.debug('Fetching payment methods')

      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, type, brand, last_four, exp_month, exp_year')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Failed to fetch payment methods', { error })
        throw error
      }

      logger.debug('Payment methods fetched', { count: data?.length || 0 })
      return (data || []) as PaymentMethod[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!paymentMethods || paymentMethods.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No payment methods on file
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {paymentMethods.map((pm) => (
        <Card key={pm.id}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {pm.brand && pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ••••{' '}
                  {pm.last_four}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires {pm.exp_month}/{pm.exp_year}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
