import { createContext, useContext } from 'react'
import type { Stripe } from '@stripe/stripe-js'

export interface StripeContextValue {
	isConfigured: boolean
	missingConfig: string[]
	publishableKey?: string
	stripePromise?: Promise<Stripe | null> | null
}

export const StripeContext = createContext<StripeContextValue | null>(null)

export function useStripe() {
	const context = useContext(StripeContext)
	if (!context) {
		throw new Error('useStripe must be used within a StripeProvider')
	}
	return context
}