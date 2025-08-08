/**
 * Official Stripe Pricing Table Component
 * This uses Stripe's hosted pricing table for a seamless checkout experience
 */

'use client'

import { useEffect } from 'react'
import Script from 'next/script'

interface StripePricingTableProps {
  pricingTableId?: string
  publishableKey?: string
  customerEmail?: string
  customerSessionClientSecret?: string
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string
          'publishable-key': string
          'customer-email'?: string
          'customer-session-client-secret'?: string
        },
        HTMLElement
      >
    }
  }
}

export function StripePricingTable({
  pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID || '',
  publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  customerEmail,
  customerSessionClientSecret,
}: StripePricingTableProps) {
  useEffect(() => {
    // Ensure the Stripe Pricing Table script is loaded
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/pricing-table.js'
    script.async = true
    
    // Only append if not already loaded
    if (!document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) {
      document.body.appendChild(script)
    }

    return () => {
      // Cleanup if needed
    }
  }, [])

  if (!pricingTableId || !publishableKey) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Pricing table configuration is missing. Please check your environment variables.
        </p>
      </div>
    )
  }

  return (
    <>
      <Script
        id="stripe-pricing-table"
        src="https://js.stripe.com/v3/pricing-table.js"
        strategy="lazyOnload"
      />
      {/* @ts-expect-error - Stripe pricing table custom element */}
      <stripe-pricing-table
        pricing-table-id={pricingTableId}
        publishable-key={publishableKey}
        customer-email={customerEmail}
        customer-session-client-secret={customerSessionClientSecret}
      />
    </>
  )
}

/**
 * Alternative component that embeds the pricing table in an iframe
 * Use this if you prefer iframe isolation
 */
export function StripePricingTableIframe({
  pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID || '',
}: {
  pricingTableId?: string
}) {
  if (!pricingTableId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Pricing table configuration is missing.
        </p>
      </div>
    )
  }

  // Construct the pricing table URL
  const pricingTableUrl = `https://pricing.stripe.com/embed/${pricingTableId}`

  return (
    <div className="w-full">
      <iframe
        src={pricingTableUrl}
        className="w-full min-h-[600px] border-0"
        title="Stripe Pricing Table"
        allow="payment"
        loading="lazy"
      />
    </div>
  )
}