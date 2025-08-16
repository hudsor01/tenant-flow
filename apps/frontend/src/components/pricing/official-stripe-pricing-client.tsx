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
					'client-reference-id'?: string
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
			<div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
				<div className="container mx-auto px-4 py-16">
					<div className="mx-auto max-w-4xl">
						<div className="mb-12 text-center">
							<h1 className="mb-4 text-4xl font-bold md:text-5xl">
								Pricing Configuration Required
							</h1>
							<p className="text-muted-foreground text-xl">
								To use Stripe's official pricing table:
							</p>
						</div>

						<div className="bg-muted space-y-4 rounded-lg p-8">
							<h2 className="mb-4 text-2xl font-semibold">
								Setup Instructions:
							</h2>
							<ol className="list-inside list-decimal space-y-3 text-left">
								<li>
									Go to your{' '}
									<a
										href="https://dashboard.stripe.com/test/pricing-tables"
										className="text-primary underline"
										target="_blank"
										rel="noopener noreferrer"
									>
										Stripe Dashboard → Pricing Tables
									</a>
								</li>
								<li>Click "Create pricing table"</li>
								<li>
									Add your 4 pricing tiers:
									<ul className="mt-2 ml-6 list-inside list-disc space-y-1">
										<li>Free Trial - $0/month</li>
										<li>
											Starter - $29/month (annual:
											$290/year)
										</li>
										<li>
											Growth - $79/month (annual:
											$790/year)
										</li>
										<li>
											TenantFlow Max - $199/month (annual:
											$1990/year)
										</li>
									</ul>
								</li>
								<li>
									Configure display settings:
									<ul className="mt-2 ml-6 list-inside list-disc space-y-1">
										<li>Enable billing interval toggle</li>
										<li>Show annual savings</li>
										<li>Add feature lists for each plan</li>
										<li>
											Mark "Growth" as featured/popular
										</li>
									</ul>
								</li>
								<li>Copy the pricing table ID</li>
								<li>
									Add to your .env.local:
									<pre className="bg-background mt-2 overflow-x-auto rounded p-4">
										<code>
											NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_xxxxx
										</code>
									</pre>
								</li>
							</ol>
						</div>

						<div className="mt-8 rounded-lg bg-blue-50 p-6 dark:bg-blue-950">
							<h3 className="mb-2 text-lg font-semibold">
								Why Use Stripe's Pricing Table?
							</h3>
							<ul className="text-muted-foreground space-y-2">
								<li>
									✓ Automatically responsive - no layout
									issues
								</li>
								<li>✓ Built-in currency localization</li>
								<li>
									✓ Handles all edge cases (trial periods,
									proration, etc.)
								</li>
								<li>
									✓ Updates automatically when you change
									prices in Stripe
								</li>
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
		<div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
			{/* Header */}
			<div className="container mx-auto px-4 py-16">
				<div className="mb-12 text-center">
					<h1 className="mb-4 text-4xl font-bold md:text-5xl">
						Choose Your Perfect Plan
					</h1>
					<p className="text-muted-foreground mx-auto max-w-2xl text-xl">
						Start with a 14-day free trial. Upgrade, downgrade, or
						cancel anytime.
					</p>
				</div>

				{/* Stripe Pricing Table - This component is fully responsive and handles everything */}
				<div className="mx-auto max-w-6xl">
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
						All plans include core features. Higher tiers offer
						increased limits and premium features.
					</p>

					<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-8">
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
				<div className="mx-auto mt-20 max-w-3xl">
					<h2 className="mb-8 text-center text-3xl font-bold">
						Common Questions
					</h2>

					<div className="grid gap-6">
						<details className="group rounded-lg border p-6">
							<summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
								Can I change plans later?
								<span className="ml-4 transition group-open:rotate-180">
									<Check className="h-5 w-5" />
								</span>
							</summary>
							<p className="text-muted-foreground mt-4">
								Yes! You can upgrade or downgrade at any time.
								Changes take effect immediately and we'll
								prorate any differences.
							</p>
						</details>

						<details className="group rounded-lg border p-6">
							<summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
								What happens after my free trial?
								<span className="ml-4 transition group-open:rotate-180">
									<Check className="h-5 w-5" />
								</span>
							</summary>
							<p className="text-muted-foreground mt-4">
								Your trial lasts 14 days. After that, you'll
								need to choose a paid plan to continue. Your
								data is always safe and you can export it
								anytime.
							</p>
						</details>

						<details className="group rounded-lg border p-6">
							<summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
								Do you offer refunds?
								<span className="ml-4 transition group-open:rotate-180">
									<Check className="h-5 w-5" />
								</span>
							</summary>
							<p className="text-muted-foreground mt-4">
								We offer a 30-day money-back guarantee for all
								new subscriptions. If you're not satisfied,
								contact support for a full refund.
							</p>
						</details>
					</div>
				</div>
			</div>
		</div>
	)
}
