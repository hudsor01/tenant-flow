import { useEffect, useState, type ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { validateStripeConfig } from '@/lib/stripe-config'
import type { StripeContextValue } from './StripeContext'
import { StripeContext } from './StripeContext'

interface StripeProviderProps {
	children: ReactNode
}

/**
 * Enhanced Stripe Provider with Stripe.js and Elements integration
 *
 * This provider:
 * 1. Validates Stripe configuration on mount
 * 2. Loads Stripe.js asynchronously
 * 3. Provides Elements wrapper for payment forms
 * 4. Provides configuration status to child components
 * 5. Logs warnings in development if configuration is incomplete
 *
 * SECURITY NOTE: All payment processing happens through secure backend endpoints.
 * This provider handles client-side Stripe Elements for payment collection.
 */
export function StripeProvider({ children }: StripeProviderProps) {
	const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
	
	// Validate Stripe configuration
	const validation = validateStripeConfig()
	const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

	// Initialize Stripe.js
	useEffect(() => {
		if (validation.isValid && publishableKey && !stripePromise) {
			const stripe = loadStripe(publishableKey)
			setStripePromise(stripe)
		}
	}, [validation.isValid, publishableKey, stripePromise])

	// Log configuration warnings in development
	useEffect(() => {
		if (!validation.isValid && import.meta.env.DEV) {
			console.warn(
				'⚠️ Stripe configuration incomplete. Missing variables:',
				validation.missing.join(', ')
			)
			console.warn(
				'Some features may not work properly without complete Stripe configuration.'
			)
		}
	}, [validation.isValid, validation.missing])

	const value: StripeContextValue = {
		isConfigured: validation.isValid,
		missingConfig: import.meta.env.DEV ? validation.missing : [],
		publishableKey,
		stripePromise
	}

	// If Stripe is not configured, provide context without Elements
	if (!validation.isValid || !stripePromise) {
		return (
			<StripeContext.Provider value={value}>
				{children}
			</StripeContext.Provider>
		)
	}

	// Provide both context and Elements wrapper
	return (
		<StripeContext.Provider value={value}>
			<Elements 
				stripe={stripePromise}
				options={{
					appearance: {
						theme: 'stripe',
						variables: {
							colorPrimary: '#0ea5e9',
							colorBackground: '#ffffff',
							colorText: '#1f2937',
							colorDanger: '#dc2626',
							fontFamily: 'system-ui, sans-serif',
							spacingUnit: '4px',
							borderRadius: '8px'
						}
					}
				}}
			>
				{children}
			</Elements>
		</StripeContext.Provider>
	)
}
