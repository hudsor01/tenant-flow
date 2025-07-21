import { useEffect, useState, type ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe, type Appearance } from '@stripe/stripe-js'
import { validateStripeConfig } from '@/lib/config/payment.config'
import { 
  stripeAppearance, 
  stripeAppearanceDark, 
  stripeAppearanceMobile 
} from '@/config/stripe-appearance'
import type { StripeContextValue } from './StripeContext'
import { StripeContext } from './StripeContext'

interface StripeProviderProps {
	children: ReactNode
	appearance?: Appearance
	darkMode?: boolean
	mobileOptimized?: boolean
	options?: any
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
export function StripeProvider({ 
	children, 
	appearance, 
	darkMode = false, 
	mobileOptimized, 
	options 
}: StripeProviderProps) {
	const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
	const [isMobile, setIsMobile] = useState(false)
	
	// Validate Stripe configuration
	const validation = validateStripeConfig()
	const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

	// Detect mobile device
	useEffect(() => {
		const checkMobile = () => {
			const userAgent = navigator.userAgent.toLowerCase()
			const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod']
			const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword)) || window.innerWidth <= 768
			setIsMobile(isMobileDevice)
		}
		
		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [])

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

	// Select the appropriate appearance configuration
	const selectedAppearance = appearance || (() => {
		if (mobileOptimized || (mobileOptimized !== false && isMobile)) {
			return stripeAppearanceMobile
		}
		return darkMode ? stripeAppearanceDark : stripeAppearance
	})()

	// Provide both context and Elements wrapper
	return (
		<StripeContext.Provider value={value}>
			<Elements 
				stripe={stripePromise}
				options={{ 
					appearance: selectedAppearance, 
					...options 
				}}
			>
				{children}
			</Elements>
		</StripeContext.Provider>
	)
}
