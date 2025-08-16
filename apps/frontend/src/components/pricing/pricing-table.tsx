'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'

// Type declaration for the Stripe pricing table web component
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

export interface PricingTableProps {
	/**
	 * The Stripe pricing table ID from your Stripe dashboard
	 * You can get this from: Dashboard → Product Catalog → Pricing Tables
	 */
	pricingTableId?: string

	/**
	 * The Stripe publishable key
	 */
	publishableKey?: string

	/**
	 * Optional customer email to pre-fill
	 */
	customerEmail?: string

	/**
	 * Optional customer session client secret for existing customers
	 */
	customerSessionClientSecret?: string

	/**
	 * Custom CSS class
	 */
	className?: string
}

/**
 * Stripe Pricing Table component
 * Embeds Stripe's native pricing table with real-time pricing and professional design
 */
export function PricingTable({
	pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID,
	publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
	customerEmail,
	customerSessionClientSecret,
	className
}: PricingTableProps) {
	const { user } = useAuth()
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		// Load Stripe pricing table script
		if (typeof window !== 'undefined') {
			const existingScript = document.querySelector(
				'script[src*="pricing-table.js"]'
			)
			if (existingScript) {
				setIsLoading(false)
				return
			}
			const script = document.createElement('script')
			script.src = 'https://js.stripe.com/v3/pricing-table.js'
			script.async = true

			script.onload = () => {
				logger.debug('Stripe pricing table script loaded', {
					component: 'PricingTable'
				})
				setIsLoading(false)
			}

			script.onerror = () => {
				logger.error('Failed to load Stripe pricing table script', {
					component: 'PricingTable'
				})
				setIsLoading(false)
			}

			document.head.appendChild(script)

			return () => {
				// Clean up script on unmount
				const existingScript = document.querySelector(
					'script[src*="pricing-table.js"]'
				)
				if (existingScript) {
					existingScript.remove()
				}
			}
		}

		return undefined
	}, [])

	if (!pricingTableId) {
		logger.warn('No pricing table ID provided', {
			component: 'PricingTable'
		})

		return (
			<div
				className={`rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center ${className || ''}`}
			>
				<h3 className="mb-2 text-lg font-semibold text-yellow-800">
					Pricing Table Not Configured
				</h3>
				<p className="text-yellow-700">
					Please configure your Stripe pricing table ID in the
					environment variables.
				</p>
				<p className="mt-2 text-sm text-yellow-600">
					Set <code>NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID</code> in your
					.env.local file.
				</p>
			</div>
		)
	}

	if (!publishableKey) {
		logger.error('No Stripe publishable key found', {
			component: 'PricingTable'
		})

		return (
			<div
				className={`rounded-lg border border-red-200 bg-red-50 p-8 text-center ${className || ''}`}
			>
				<h3 className="mb-2 text-lg font-semibold text-red-800">
					Stripe Configuration Error
				</h3>
				<p className="text-red-700">
					Stripe publishable key is missing. Please check your
					environment configuration.
				</p>
			</div>
		)
	}

	// Determine customer email (props override user email)
	const email = customerEmail || user?.email

	logger.debug('Rendering Stripe pricing table', {
		component: 'PricingTable',
		pricingTableId,
		hasCustomerEmail: !!email,
		hasCustomerSession: !!customerSessionClientSecret
	})

	return (
		<div className={className} data-testid="pricing-table-container">
			{isLoading && (
				<div className="p-4 text-center text-gray-500">
					Loading pricing...
				</div>
			)}
			{/* @ts-expect-error - Stripe pricing table custom element */}
			<stripe-pricing-table
				pricing-table-id={pricingTableId}
				publishable-key={publishableKey}
				customer-email={email}
				customer-session-client-secret={customerSessionClientSecret}
			/>
		</div>
	)
}
