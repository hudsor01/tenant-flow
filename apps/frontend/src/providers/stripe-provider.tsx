'use client'

import { CheckoutProvider } from '@stripe/react-stripe-js/checkout'
import { loadStripe } from '@stripe/stripe-js'
import { useMutation } from '@tanstack/react-query'
import { apiClient, API_BASE_URL } from '@/lib/api-client'
import type { StripeCheckoutSessionResponse } from '@repo/shared'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Comprehensive appearance object mapping globals.css design system to Stripe Elements API
const appearance = {
	theme: 'stripe' as const,
	variables: {
		// Typography System - Roboto Flex from globals.css
		fontFamily: 'Roboto Flex, Roboto, system-ui, BlinkMacSystemFont, sans-serif', // --font-family
		fontSizeBase: '13px', // --font-body
		fontSizeSm: '12px',   // --font-callout
		fontSizeXs: '10px',   // --font-footnote
		fontWeightNormal: '400',
		fontWeightMedium: '500',
		lineHeight: '1.5',

		// OKLCH Color System - Complete mapping from globals.css
		colorPrimary: 'oklch(0.623 0.214 259.815)',           // --color-accent-main
		colorBackground: 'oklch(1 0 0)',                       // white background
		colorText: 'oklch(0 0 0 / 85%)',                      // --color-label-primary
		colorTextSecondary: 'oklch(0 0 0 / 50%)',             // --color-label-secondary
		colorTextPlaceholder: 'oklch(0 0 0 / 25%)',           // --color-label-tertiary
		colorIconTab: 'oklch(0 0 0 / 50%)',                   // --color-label-secondary
		colorIconTabSelected: 'oklch(0.623 0.214 259.815)',   // --color-accent-main
		colorIconCardError: 'oklch(0.534 0.183 27.353)',      // --color-system-red
		colorDanger: 'oklch(0.534 0.183 27.353)',             // --color-system-red
		colorSuccess: 'oklch(0.648 0.159 145.382)',           // --color-system-green
		colorWarning: 'oklch(0.607 0.213 258.623)',           // --color-system-blue

		// Layout & Spacing System from globals.css
		spacingUnit: '4px',
		spacingGridColumn: '12px',
		spacingGridRow: '16px',

		// Border Radius System from globals.css
		borderRadius: '8px',        // --radius-small
		borderRadiusLarge: '12px',  // --radius-medium

		// Focus States with accent color
		focusBoxShadow: '0 0 0 3px oklch(0.623 0.214 259.815 / 15%)', // --color-accent-15
		focusOutline: 'none',
	},
	rules: {
		// Enhanced Input Field Styling
		'.Input': {
			backgroundColor: 'oklch(1 0 0)', // white
			border: '1px solid oklch(0.31 0 0 / 29%)', // --color-separator
			borderRadius: '8px', // --radius-small
			fontSize: '13px', // --font-body
			fontFamily: 'Roboto Flex, Roboto, system-ui, BlinkMacSystemFont, sans-serif',
			padding: '12px 16px',
			minHeight: '44px', // Touch-first minimum from UI standards
			transition: 'all 200ms cubic-bezier(0, 0, 0.2, 1)', // --duration-200 --ease-out
			color: 'oklch(0 0 0 / 85%)', // --color-label-primary
		},
		'.Input:focus': {
			borderColor: 'oklch(0.623 0.214 259.815)', // --color-accent-main
			boxShadow: '0 0 0 3px oklch(0.623 0.214 259.815 / 15%)', // --color-accent-15
			outline: 'none',
			transform: 'none', // Prevent layout shift
		},
		'.Input:hover': {
			borderColor: 'oklch(0.623 0.214 259.815 / 50%)', // --color-accent-50
		},
		'.Input--invalid': {
			borderColor: 'oklch(0.534 0.183 27.353)', // --color-system-red
			boxShadow: '0 0 0 3px oklch(0.534 0.183 27.353 / 15%)', // --color-system-red-15
		},
		'.Input--complete': {
			borderColor: 'oklch(0.648 0.159 145.382)', // --color-system-green
		},
		'.Input:disabled': {
			backgroundColor: 'oklch(0 0 0 / 3%)', // --color-fill-quaternary
			borderColor: 'oklch(0 0 0 / 10%)', // --color-fill-primary
			color: 'oklch(0 0 0 / 25%)', // --color-label-tertiary
			cursor: 'not-allowed',
		},

		// Label Styling
		'.Label': {
			fontSize: '12px', // --font-callout
			fontWeight: '500',
			fontFamily: 'Roboto Flex, Roboto, system-ui, BlinkMacSystemFont, sans-serif',
			color: 'oklch(0 0 0 / 85%)', // --color-label-primary
			marginBottom: '6px',
			lineHeight: '1.4',
		},

		// Tab Styling for Payment Methods
		'.Tab': {
			backgroundColor: 'oklch(0 0 0 / 5%)', // --color-fill-tertiary
			borderRadius: '8px', // --radius-small
			border: '1px solid oklch(0.31 0 0 / 29%)', // --color-separator
			padding: '12px 16px',
			minHeight: '44px', // Touch-first minimum
			fontSize: '13px', // --font-body
			fontFamily: 'Roboto Flex, Roboto, system-ui, BlinkMacSystemFont, sans-serif',
			transition: 'all 200ms cubic-bezier(0, 0, 0.2, 1)', // --duration-200 --ease-out
			cursor: 'pointer',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		},
		'.Tab:hover': {
			backgroundColor: 'oklch(0 0 0 / 8%)', // --color-fill-secondary
			borderColor: 'oklch(0.623 0.214 259.815 / 50%)', // --color-accent-50
		},
		'.Tab--selected': {
			backgroundColor: 'oklch(0.623 0.214 259.815 / 10%)', // --color-accent-10
			borderColor: 'oklch(0.623 0.214 259.815)', // --color-accent-main
			color: 'oklch(0.623 0.214 259.815)', // --color-accent-main
			fontWeight: '500',
		},
		'.Tab--selected:hover': {
			backgroundColor: 'oklch(0.623 0.214 259.815 / 15%)', // --color-accent-15
		},

		// Error Message Styling
		'.Error': {
			color: 'oklch(0.534 0.183 27.353)', // --color-system-red
			fontSize: '12px', // --font-callout
			fontFamily: 'Roboto Flex, Roboto, system-ui, BlinkMacSystemFont, sans-serif',
			marginTop: '6px',
			lineHeight: '1.4',
			fontWeight: '400',
		},

		// Container and Block Styling
		'.Block': {
			backgroundColor: 'oklch(1 0 0)', // white
			borderRadius: '8px', // --radius-small
			padding: '0',
		},
		'.BlockDivider': {
			backgroundColor: 'oklch(0.31 0 0 / 29%)', // --color-separator
			height: '1px',
			margin: '16px 0',
		},

		// Loading States
		'.Spinner': {
			color: 'oklch(0.623 0.214 259.815)', // --color-accent-main
		},

		// Checkbox and Radio Button Styling
		'.Checkbox': {
			backgroundColor: 'oklch(1 0 0)', // white
			borderColor: 'oklch(0.31 0 0 / 29%)', // --color-separator
			borderRadius: '4px',
		},
		'.Checkbox--checked': {
			backgroundColor: 'oklch(0.623 0.214 259.815)', // --color-accent-main
			borderColor: 'oklch(0.623 0.214 259.815)', // --color-accent-main
		},
		'.Radio': {
			backgroundColor: 'oklch(1 0 0)', // white
			borderColor: 'oklch(0.31 0 0 / 29%)', // --color-separator
		},
		'.Radio--checked': {
			backgroundColor: 'oklch(0.623 0.214 259.815)', // --color-accent-main
			borderColor: 'oklch(0.623 0.214 259.815)', // --color-accent-main
		}
	}
}

interface StripeProviderProps {
	children: React.ReactNode
	priceId?: string
	mode?: 'payment' | 'subscription' | 'setup'
}

export function StripeProvider({ children, priceId, mode = 'subscription' }: StripeProviderProps) {
	// TanStack Query mutation for client secret fetching
	const fetchClientSecretMutation = useMutation({
		mutationFn: async () => {
			const response = await apiClient<StripeCheckoutSessionResponse>(`${API_BASE_URL}/api/v1/stripe/create-embedded-checkout-session`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					priceId,
					domain: window.location.origin,
					mode
				})
			})
			return response.client_secret
		}
	})

	// Stripe's required fetchClientSecret function
	const fetchClientSecret = async (): Promise<string> => {
		const result = await fetchClientSecretMutation.mutateAsync()
		return result
	}

	const options = {
		fetchClientSecret,
		elementsOptions: {
			appearance
		}
	}

	return (
		<CheckoutProvider stripe={stripePromise} options={options}>
			{children}
		</CheckoutProvider>
	)
}

StripeProvider.displayName = 'StripeProvider'
