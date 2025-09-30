// TypeScript declarations for Stripe integration
import * as React from 'react'

declare module 'react' {
	namespace JSX {
		interface IntrinsicElements {
			'stripe-pricing-table': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					'pricing-table-id'?: string
					'publishable-key'?: string
					'client-reference-id'?: string
					'customer-email'?: string
					'customer-session-client-secret'?: string
				},
				HTMLElement
			>
		}
	}
}

// Stripe environment configuration
export interface StripeEnvironmentConfig {
	publishableKey: string
	secretKey?: string
	prices?: {
		starter_monthly?: string
		starter_annual?: string
		growth_monthly?: string
		growth_annual?: string
		max_monthly?: string
		max_annual?: string
	}
	products?: {
		starter?: string
		growth?: string
		max?: string
	}
}

// Subscription data from Stripe
export interface SubscriptionData {
	id: string
	status: string
	currentPeriodEnd: number
	cancelAtPeriodEnd: boolean
	customerId: string
	planName?: string
	interval?: 'monthly' | 'annual'
	items: {
		id: string
		priceId: string
		quantity: number
	}[]
}
