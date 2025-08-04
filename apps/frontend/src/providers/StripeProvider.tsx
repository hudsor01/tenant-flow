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

// Initialize Stripe.js once at module level (official Stripe pattern)
// This ensures singleton behavior and prevents multiple loadStripe calls
let stripePromise: Promise<Stripe | null> | null = null

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}


interface StripeProviderProps {
	children: ReactNode
	appearance?: Appearance
	darkMode?: boolean
	mobileOptimized?: boolean
	options?: {
		mode?: 'payment' | 'setup' | 'subscription'
		currency?: string
		amount?: number
		setupFutureUsage?: 'on_session' | 'off_session'
		captureMethod?: 'automatic' | 'manual'
		clientSecret?: string
	}
}

/**
 * Enhanced Stripe Provider with Stripe.js and Elements integration
 * 
 * Follows official Stripe React.js patterns:
 * - Singleton Stripe.js initialization at module level
 * - Immutable Elements options (use elements.update() for changes)
 * - Proper error handling and configuration validation
 * - PCI compliant loading from js.stripe.com
 *
 * This provider:
 * 1. Validates Stripe configuration on mount
 * 2. Uses singleton loadStripe pattern (official best practice)
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
	const [currentStripePromise, setCurrentStripePromise] = useState<Promise<Stripe | null> | null>(null)
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

	// Initialize Stripe.js using singleton pattern (official Stripe best practice)
	useEffect(() => {
		if (validation.isValid && publishableKey) {
			const stripe = getStripePromise(publishableKey)
			setCurrentStripePromise(stripe)
		}
	}, [validation.isValid, publishableKey])

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
		stripePromise: currentStripePromise
	}

	// If Stripe is not configured, provide context without Elements
	if (!validation.isValid || !currentStripePromise) {
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
	// Using official Stripe pattern: pass Promise to Elements (immutable after setting)
	return (
		<StripeContext.Provider value={value}>
			<Elements 
				stripe={currentStripePromise}
				options={options?.clientSecret ? {
					clientSecret: options.clientSecret,
					appearance: selectedAppearance,
					...(options.currency && { currency: options.currency }),
					...(options.amount && { amount: options.amount }),
					...(options.setupFutureUsage && { setupFutureUsage: options.setupFutureUsage }),
					...(options.captureMethod && { captureMethod: options.captureMethod })
				} : {
					mode: options?.mode || 'payment',
					currency: options?.currency || 'usd',
					amount: options?.amount || 1000,
					appearance: selectedAppearance,
					...(options?.setupFutureUsage && { setupFutureUsage: options.setupFutureUsage }),
					...(options?.captureMethod && { captureMethod: options.captureMethod })
				}}
			>
				{children}
			</Elements>
		</StripeContext.Provider>
	)
}
