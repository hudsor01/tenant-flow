"use client"

import { ExpressCheckoutElement } from '@stripe/react-stripe-js'
import { Separator } from '@/components/ui/separator'

type Props = {
  onConfirm: (event: unknown) => void
}

export function ExpressCheckout({ onConfirm }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3 bg-background/50">
        <ExpressCheckoutElement
          onConfirm={onConfirm}
          options={{
            paymentMethodOrder: ['apple_pay', 'google_pay', 'paypal', 'link'],
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>
      <div className="relative">
        <Separator />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-background px-2 body-xs text-muted-foreground">or pay with card</span>
        </div>
      </div>
    </div>
  )
}

