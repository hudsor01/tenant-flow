/**
 * Stripe Hosted Pricing Table Component
 * This uses Stripe's hosted pricing table for a seamless checkout experience
 * Requires a pricing table to be created in the Stripe Dashboard
 */

"use client"

import { useEffect } from 'react'
import Script from 'next/script'

interface StripeHostedPricingTableProps {
  pricingTableId?: string
  publishableKey?: string
  customerEmail?: string
  customerSessionClientSecret?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string
          'publishable-key': string
          'customer-email'?: string
          'customer-session-client-secret'?: string
          'client-reference-id'?: string
        },
        HTMLElement
      >
    }
  }
}

export function StripeHostedPricingTable({
  pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID ?? '',
  publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  customerEmail,
  customerSessionClientSecret
}: StripeHostedPricingTableProps) {
  useEffect(() => {
    // Ensure the Stripe Pricing Table script is loaded
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/pricing-table.js'
    script.async = true

    // Only append if not already loaded
    if (
      !document.querySelector(
        'script[src="https://js.stripe.com/v3/pricing-table.js"]'
      )
    ) {
      document.body.appendChild(script)
    }

    return () => {
      // Cleanup if needed
    }
  }, [])

  if (!pricingTableId || !publishableKey) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          Stripe pricing table configuration is missing. Please check your
          environment variables.
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
export function StripeHostedPricingTableIframe({
  pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID ?? ''
}: {
  pricingTableId?: string
}) {
  if (!pricingTableId) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          Pricing table configuration is missing.
        </p>
      </div>
    )
  }

  return (
    <iframe
      src={`https://js.stripe.com/v3/pricing-table.html?pricing_table_id=${pricingTableId}`}
      width="100%"
      height="600"
      className="border-0 rounded-lg"
      title="Stripe Pricing Table"
    />
  )
}