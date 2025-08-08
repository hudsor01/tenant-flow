'use client'

import { useAuth } from '@/hooks/use-auth'
import Script from 'next/script'
import { Check } from 'lucide-react'

// You need to create a pricing table in your Stripe Dashboard and get the ID
// Go to: https://dashboard.stripe.com/test/pricing-tables
const PRICING_TABLE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID || ''
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

// TypeScript declaration for Stripe pricing table element
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

/**
 * Client component for Official Stripe Pricing
 * Handles Stripe script loading and user email integration
 */
export function OfficialStripePricingClient() {
  const { user } = useAuth()

  if (!PRICING_TABLE_ID || !PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Pricing Configuration Required
              </h1>
              <p className="text-xl text-muted-foreground">
                To use Stripe's official pricing table:
              </p>
            </div>
            
            <div className="bg-muted rounded-lg p-8 space-y-4">
              <h2 className="text-2xl font-semibold mb-4">Setup Instructions:</h2>
              <ol className="list-decimal list-inside space-y-3 text-left">
                <li>
                  Go to your <a href="https://dashboard.stripe.com/test/pricing-tables" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                    Stripe Dashboard → Pricing Tables
                  </a>
                </li>
                <li>Click "Create pricing table"</li>
                <li>Add your 4 pricing tiers:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Free Trial - $0/month</li>
                    <li>Starter - $29/month (annual: $290/year)</li>
                    <li>Growth - $79/month (annual: $790/year)</li>
                    <li>TenantFlow Max - $199/month (annual: $1990/year)</li>
                  </ul>
                </li>
                <li>Configure display settings:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Enable billing interval toggle</li>
                    <li>Show annual savings</li>
                    <li>Add feature lists for each plan</li>
                    <li>Mark "Growth" as featured/popular</li>
                  </ul>
                </li>
                <li>Copy the pricing table ID</li>
                <li>Add to your .env.local:
                  <pre className="bg-background p-4 rounded mt-2 overflow-x-auto">
                    <code>NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_xxxxx</code>
                  </pre>
                </li>
              </ol>
            </div>

            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Why Use Stripe's Pricing Table?</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Automatically responsive - no layout issues</li>
                <li>✓ Built-in currency localization</li>
                <li>✓ Handles all edge cases (trial periods, proration, etc.)</li>
                <li>✓ Updates automatically when you change prices in Stripe</li>
                <li>✓ Optimized checkout conversion</li>
                <li>✓ No maintenance required</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with a 14-day free trial. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>

        {/* Stripe Pricing Table - This component is fully responsive and handles everything */}
        <div className="max-w-6xl mx-auto">
          <Script
            src="https://js.stripe.com/v3/pricing-table.js"
            strategy="lazyOnload"
          />
          {/* @ts-expect-error - Stripe pricing table custom element */}
          <stripe-pricing-table
            pricing-table-id={PRICING_TABLE_ID}
            publishable-key={PUBLISHABLE_KEY}
            customer-email={user?.email}
          />
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-8">
            All plans include core features. Higher tiers offer increased limits and premium features.
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Secure payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>24/7 support</span>
            </div>
          </div>
        </div>

        {/* Simple FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Common Questions
          </h2>
          
          <div className="grid gap-6">
            <details className="group rounded-lg border p-6">
              <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                Can I change plans later?
                <span className="ml-4 transition group-open:rotate-180">
                  <Check className="h-5 w-5" />
                </span>
              </summary>
              <p className="mt-4 text-muted-foreground">
                Yes! You can upgrade or downgrade at any time. Changes take effect immediately and we'll prorate any differences.
              </p>
            </details>

            <details className="group rounded-lg border p-6">
              <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                What happens after my free trial?
                <span className="ml-4 transition group-open:rotate-180">
                  <Check className="h-5 w-5" />
                </span>
              </summary>
              <p className="mt-4 text-muted-foreground">
                Your trial lasts 14 days. After that, you'll need to choose a paid plan to continue. Your data is always safe and you can export it anytime.
              </p>
            </details>

            <details className="group rounded-lg border p-6">
              <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                Do you offer refunds?
                <span className="ml-4 transition group-open:rotate-180">
                  <Check className="h-5 w-5" />
                </span>
              </summary>
              <p className="mt-4 text-muted-foreground">
                We offer a 30-day money-back guarantee for all new subscriptions. If you're not satisfied, contact support for a full refund.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}