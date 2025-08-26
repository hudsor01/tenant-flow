/**
 * Enhanced Stripe Elements Provider - Latest 2025 Patterns
 *
 * Implements Stripe's latest best practices for Elements integration:
 * - Optimized appearance configuration
 * - Enhanced error handling and retry logic
 * - Performance optimizations with lazy loading
 * - Advanced locale and currency support
 * - Improved accessibility features
 */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import {
	loadStripe,
	type Stripe,
	type StripeElementsOptions
} from '@stripe/stripe-js'
import { useThemeManager } from '@/hooks/use-app-store'
<<<<<<< HEAD
import { logger } from '@/lib/logger/logger'
=======
import { logger } from '../logger/logger'
>>>>>>> origin/main

// Lazy load Stripe for better performance
let stripePromise: Promise<Stripe | null> | null = null

<<<<<<< HEAD
const getStripe = async () => {
=======
const getStripe = () => {
>>>>>>> origin/main
	if (!stripePromise && typeof window !== 'undefined') {
		const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

		if (!publishableKey) {
			logger.error('Missing Stripe publishable key')
			return null
		}

		stripePromise = loadStripe(publishableKey, {
			// Optimized for better performance
			apiVersion: '2023-10-16', // Use latest stable API version
			// Enhanced locale support
			locale: 'auto'
		})
	}

	return stripePromise
}

export interface EnhancedElementsProviderProps {
	children: React.ReactNode
	clientSecret?: string
	appearance?: 'default' | 'minimal' | 'night'
	currency?: string
	amount?: number
	mode?: 'payment' | 'setup' | 'subscription'
	customerOptions?: {
		customer?: string
		ephemeralKey?: string
	}
}

/**
 * Enhanced Stripe Elements Provider with 2025 best practices
 */
export function EnhancedElementsProvider({
	children,
	clientSecret,
	appearance = 'default',
	currency = 'usd',
<<<<<<< HEAD
	amount: _amount,
=======
	amount,
>>>>>>> origin/main
	mode = 'payment',
	customerOptions
}: EnhancedElementsProviderProps) {
	const { effectiveTheme } = useThemeManager()
	const [stripeError, setStripeError] = useState<string | null>(null)
	const [isRetrying, setIsRetrying] = useState(false)
<<<<<<< HEAD
	const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null)
	const [isLoading, setIsLoading] = useState(true)
=======
>>>>>>> origin/main

	// Enhanced appearance configuration with theme integration
	const elementsAppearance = useMemo(() => {
		const isDark = effectiveTheme === 'dark'

		const baseAppearance = {
<<<<<<< HEAD
			theme: (isDark ? 'night' : 'stripe') as 'flat' | 'stripe' | 'night',
=======
			theme: (isDark ? 'night' : 'stripe') as 'night' | 'stripe',
>>>>>>> origin/main

			// Enhanced styling variables for 2025
			variables: {
				// Color scheme
				colorPrimary: '#0070f3', // Brand primary color
				colorBackground: isDark ? '#0a0a0a' : '#ffffff',
				colorText: isDark ? '#ffffff' : '#1a1a1a',
				colorDanger: '#df1b41',
				colorWarning: '#ffb946',
				colorSuccess: '#00d084',

				// Typography
				fontFamily: '"Inter", "system-ui", sans-serif',
				fontSizeBase: '16px',
				fontWeightNormal: '400',
				fontWeightBold: '600',

				// Layout
				borderRadius: '8px',
				spacingUnit: '4px',
				spacingGridRow: '20px',
				spacingGridColumn: '20px',

				// Enhanced focus and hover states
				colorPrimaryText: isDark ? '#ffffff' : '#0070f3',
				colorTextSecondary: isDark ? '#a0a0a0' : '#6b7280',
				colorTextPlaceholder: isDark ? '#666666' : '#9ca3af',

				// Border styling
				colorBorder: isDark ? '#333333' : '#e5e7eb',
				colorBorderFocus: '#0070f3',

				// Input styling
				colorInputBackground: isDark ? '#1a1a1a' : '#ffffff',
				colorInputBorder: isDark ? '#333333' : '#d1d5db',
				colorInputText: isDark ? '#ffffff' : '#111827'
			},

			// Enhanced component rules for better UX
			rules: {
				'.Input': {
					padding: '12px 16px',
					fontSize: '16px',
					lineHeight: '24px',
					border: `1px solid ${isDark ? '#333333' : '#d1d5db'}`,
					borderRadius: '8px',
					backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
					transition: 'all 0.2s ease',
					boxShadow: 'none'
				},
				'.Input:focus': {
					borderColor: '#0070f3',
					boxShadow: '0 0 0 3px rgba(0, 112, 243, 0.1)',
					outline: 'none'
				},
				'.Input:hover': {
					borderColor: isDark ? '#666666' : '#9ca3af'
				},
				'.Input--invalid': {
					borderColor: '#df1b41',
					boxShadow: '0 0 0 3px rgba(223, 27, 65, 0.1)'
				},
				'.Label': {
					fontSize: '14px',
					fontWeight: '500',
					color: isDark ? '#ffffff' : '#374151',
					marginBottom: '6px'
				},
				'.Error': {
					fontSize: '14px',
					color: '#df1b41',
					marginTop: '6px'
				},
				'.TabLabel': {
					fontSize: '14px',
					fontWeight: '500',
					padding: '8px 16px'
				},
				'.Tab': {
					borderRadius: '6px',
					border: `1px solid ${isDark ? '#333333' : '#e5e7eb'}`,
					backgroundColor: isDark ? '#1a1a1a' : '#ffffff'
				},
				'.Tab:hover': {
					backgroundColor: isDark ? '#262626' : '#f9fafb'
				},
				'.Tab--selected': {
					backgroundColor: isDark ? '#0070f3' : '#0070f3',
					borderColor: '#0070f3',
					color: '#ffffff'
				}
			}
		}

		// Apply appearance customizations
		if (appearance === 'minimal') {
			baseAppearance.rules = {
				...baseAppearance.rules,
				'.Input': {
					...baseAppearance.rules['.Input'],
					border: 'none',
					borderRadius: '0',
					backgroundColor: 'transparent',
					padding: '12px 0'
				}
			}
		}

		return baseAppearance
	}, [effectiveTheme, appearance])

	// Enhanced Elements options with latest features
	const elementsOptions = useMemo((): StripeElementsOptions => {
		const options: StripeElementsOptions = {
			appearance: elementsAppearance,

			// Improved customer session support
<<<<<<< HEAD
			...(customerOptions?.customer &&
=======
			...(customerOptions &&
				customerOptions.customer &&
>>>>>>> origin/main
				customerOptions.ephemeralKey && {
					customerOptions: {
						customer: customerOptions.customer,
						ephemeralKey: customerOptions.ephemeralKey
					}
				}),

			// Enhanced currency and locale settings
			currency: currency.toLowerCase(),
			locale: 'auto' // Auto-detect user locale

			// Note: Advanced fraud prevention handled via client secret configuration
		}

		// Add client secret for payment modes
		if (clientSecret) {
			if (mode === 'payment') {
				options.clientSecret = clientSecret
			} else if (mode === 'setup') {
				options.clientSecret = clientSecret
			} else if (mode === 'subscription') {
				options.clientSecret = clientSecret
			}
		}

		// Note: Amount is handled via clientSecret, not directly on options

		return options
	}, [elementsAppearance, clientSecret, currency, mode, customerOptions])

	// Enhanced error handling with retry logic
	const handleStripeError = (error: Error) => {
		logger.error('Stripe initialization error', error)
		setStripeError(error.message)

		// Auto-retry after 3 seconds for network-related errors
		if (
			error.message.includes('network') ||
			error.message.includes('timeout')
		) {
			setIsRetrying(true)
			setTimeout(() => {
				setIsRetrying(false)
				setStripeError(null)
				// Re-initialize Stripe
				stripePromise = null
			}, 3000)
		}
	}

	// Monitor Stripe loading state
	useEffect(() => {
<<<<<<< HEAD
		const loadStripeInstance = async () => {
			try {
				setIsLoading(true)
				const stripe = await getStripe()
				setStripeInstance(stripe)
				setStripeError(null)
			} catch (error) {
				handleStripeError(error as Error)
			} finally {
				setIsLoading(false)
			}
		}

		void loadStripeInstance()
=======
		const stripe = getStripe()
		if (stripe) {
			stripe.catch(handleStripeError)
		}
>>>>>>> origin/main
	}, [])

	// Show error state with retry option
	if (stripeError && !isRetrying) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center">
				<div className="mb-4 text-red-600">
					<svg
						className="mx-auto mb-2 h-12 w-12"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p className="font-semibold">Payment system unavailable</p>
					<p className="mt-1 text-sm text-gray-600">{stripeError}</p>
				</div>
				<button
					onClick={() => {
						setStripeError(null)
<<<<<<< HEAD
						setIsRetrying(true)
						stripePromise = null
						// Reload Stripe
						const loadStripeInstance = async () => {
							try {
								const stripe = await getStripe()
								setStripeInstance(stripe)
								setStripeError(null)
							} catch (error) {
								handleStripeError(error as Error)
							} finally {
								setIsRetrying(false)
							}
						}
						void loadStripeInstance()
=======
						stripePromise = null
>>>>>>> origin/main
					}}
					className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
				>
					Try Again
				</button>
			</div>
		)
	}

	// Show loading state during retry
	if (isRetrying) {
		return (
			<div className="flex flex-col items-center justify-center p-8">
<<<<<<< HEAD
				<div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
=======
				<div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
>>>>>>> origin/main
				<p className="text-gray-600">Reconnecting payment system...</p>
			</div>
		)
	}

<<<<<<< HEAD
	// Show loading state while Stripe is being initialized
	if (isLoading || !stripeInstance) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
=======
	const stripe = getStripe()

	if (!stripe) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
>>>>>>> origin/main
					<p className="text-gray-600">Loading payment system...</p>
				</div>
			</div>
		)
	}

	return (
		<Elements
<<<<<<< HEAD
			stripe={stripeInstance}
=======
			stripe={stripe}
>>>>>>> origin/main
			options={elementsOptions}
			key={`${effectiveTheme}-${appearance}-${mode}`} // Force re-render on theme/mode changes
		>
			{children}
		</Elements>
	)
}
