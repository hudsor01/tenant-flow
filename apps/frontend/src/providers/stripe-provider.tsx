'use client'

import { useCallback, useMemo } from 'react'

import { EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import type { Appearance } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useMutation } from '@tanstack/react-query'

import { API_BASE_URL, apiClient } from '@/lib/api-client'
import type { StripeCheckoutSessionResponse } from '@repo/shared/types/core'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!publishableKey) {
	throw new Error(
		'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required to initialise Stripe.'
	)
}

const stripePromise = loadStripe(publishableKey)

const FALLBACK_TOKENS = {
	fontFamily: 'Roboto Flex, Roboto, system-ui, BlinkMacSystemFont, sans-serif',
	fontSizeBase: '13px',
	fontSizeSm: '12px',
	fontSizeXs: '10px',
	fontWeightNormal: '400',
	fontWeightMedium: '500',
	lineHeight: '1.5',
	colorPrimary: 'oklch(0.623 0.214 259.815)',
	colorBackground: 'oklch(1 0 0)',
	colorText: 'oklch(0 0 0 / 85%)',
	colorTextSecondary: 'oklch(0 0 0 / 50%)',
	colorTextPlaceholder: 'oklch(0 0 0 / 25%)',
	colorDanger: 'oklch(0.534 0.183 27.353)',
	colorSuccess: 'oklch(0.648 0.159 145.382)',
	colorWarning: 'oklch(0.607 0.213 258.623)',
	separator: 'oklch(0.31 0 0 / 29%)',
	fillPrimary: 'oklch(0 0 0 / 10%)',
	fillSecondary: 'oklch(0 0 0 / 8%)',
	fillMuted: 'oklch(0 0 0 / 3%)',
	fillDisabled: 'oklch(0 0 0 / 2%)',
	spacing1: '0.25rem',
	spacing2: '0.5rem',
	spacing3: '0.75rem',
	spacing4: '1rem',
	spacing11: '2.75rem',
	ringWidth: '3px'
} as const

type CssStyles = CSSStyleDeclaration | null

const resolveCssVariable = (
	styles: CssStyles,
	cssVariable: string,
	fallback: string
): string => {
	if (!styles) {
		return fallback
	}
	const value = styles.getPropertyValue(cssVariable)
	return value.trim() || fallback
}

const withOpacity = (color: string, opacity: number): string => {
	const trimmed = color.trim()

	if (trimmed.includes('/')) {
		return trimmed
	}

	if (trimmed.startsWith('rgb(')) {
		const alpha = opacity.toFixed(2)
		return trimmed.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
	}

	if (trimmed.startsWith('oklch(') || trimmed.startsWith('hsl(')) {
		const percent = `${Math.round(opacity * 100)}%`
		return `${trimmed.replace(')', '')} / ${percent})`
	}

	return trimmed
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const buildStripeAppearance = (): Appearance => {
	const styles =
		typeof window === 'undefined'
			? null
			: window.getComputedStyle(document.documentElement)

	const colorPrimary = resolveCssVariable(
		styles,
		'--color-primary-brand',
		FALLBACK_TOKENS.colorPrimary
	)
	const colorBackground = resolveCssVariable(
		styles,
		'--card',
		FALLBACK_TOKENS.colorBackground
	)
	const colorText = resolveCssVariable(
		styles,
		'--color-label-primary',
		FALLBACK_TOKENS.colorText
	)
	const colorTextSecondary = resolveCssVariable(
		styles,
		'--color-label-secondary',
		FALLBACK_TOKENS.colorTextSecondary
	)
	const colorTextPlaceholder = resolveCssVariable(
		styles,
		'--color-label-tertiary',
		FALLBACK_TOKENS.colorTextPlaceholder
	)
	const colorDanger = resolveCssVariable(
		styles,
		'--color-system-red',
		FALLBACK_TOKENS.colorDanger
	)
	const colorSuccess = resolveCssVariable(
		styles,
		'--color-system-green',
		FALLBACK_TOKENS.colorSuccess
	)
	const colorWarning = resolveCssVariable(
		styles,
		'--color-system-blue',
		FALLBACK_TOKENS.colorWarning
	)
	const separator = resolveCssVariable(
		styles,
		'--color-separator',
		FALLBACK_TOKENS.separator
	)
	const fillPrimary = resolveCssVariable(
		styles,
		'--color-fill-primary',
		FALLBACK_TOKENS.fillPrimary
	)
	const fillSecondary = resolveCssVariable(
		styles,
		'--color-fill-secondary',
		FALLBACK_TOKENS.fillSecondary
	)
	const fillDisabled = resolveCssVariable(
		styles,
		'--color-fill-quaternary',
		FALLBACK_TOKENS.fillDisabled
	)
	const fontFamily = resolveCssVariable(
		styles,
		'--font-family',
		FALLBACK_TOKENS.fontFamily
	)
	const fontSizeBase = resolveCssVariable(
		styles,
		'--font-body',
		FALLBACK_TOKENS.fontSizeBase
	)
	const fontSizeSm = resolveCssVariable(
		styles,
		'--font-callout',
		FALLBACK_TOKENS.fontSizeSm
	)
	const fontSizeXs = resolveCssVariable(
		styles,
		'--font-caption-2',
		FALLBACK_TOKENS.fontSizeXs
	)
	const fontWeightNormal = resolveCssVariable(
		styles,
		'--font-weight-normal',
		FALLBACK_TOKENS.fontWeightNormal
	)
	const fontWeightMedium = resolveCssVariable(
		styles,
		'--font-weight-medium',
		FALLBACK_TOKENS.fontWeightMedium
	)
	const lineHeight = resolveCssVariable(
		styles,
		'--line-height-body',
		FALLBACK_TOKENS.lineHeight
	)
	const spacing1 = resolveCssVariable(
		styles,
		'--spacing-1',
		FALLBACK_TOKENS.spacing1
	)
	const spacing1_5 = resolveCssVariable(styles, '--spacing-1_5', '0.375rem')
	const spacing2 = resolveCssVariable(
		styles,
		'--spacing-2',
		FALLBACK_TOKENS.spacing2
	)
	const spacing3 = resolveCssVariable(
		styles,
		'--spacing-3',
		FALLBACK_TOKENS.spacing3
	)
	const spacing4 = resolveCssVariable(
		styles,
		'--spacing-4',
		FALLBACK_TOKENS.spacing4
	)
	const spacing11 = resolveCssVariable(
		styles,
		'--spacing-11',
		FALLBACK_TOKENS.spacing11
	)
	const radiusSmall = resolveCssVariable(styles, '--radius-small', '0.5rem')
	const radiusSm = resolveCssVariable(styles, '--radius-sm', '0.25rem')
	const duration200 = resolveCssVariable(styles, '--duration-200', '200ms')
	const easeOut = resolveCssVariable(
		styles,
		'--ease-out',
		'cubic-bezier(0, 0, 0.2, 1)'
	)
	const focusRingWidth = resolveCssVariable(
		styles,
		'--focus-ring-width',
		FALLBACK_TOKENS.ringWidth
	)
	const focusRingColor = resolveCssVariable(
		styles,
		'--focus-ring-color',
		colorPrimary
	)

	const focusRingShadow = `0 0 0 ${focusRingWidth} ${withOpacity(
		focusRingColor,
		0.15
	)}`
	const hoverPrimaryBorder = withOpacity(colorPrimary, 0.5)

	const transitionAll = `all ${duration200} ${easeOut}`

	return {
		theme: 'stripe',
		variables: {
			fontFamily,
			fontSizeBase,
			fontSizeSm,
			fontSizeXs,
			fontWeightNormal,
			fontWeightMedium,
			colorPrimary,
			colorBackground,
			colorText,
			colorTextSecondary,
			colorTextPlaceholder,
			colorIconTab: colorTextSecondary,
			colorIconTabSelected: colorPrimary,
			colorIconCardError: colorDanger,
			colorDanger,
			colorSuccess,
			colorWarning,
			spacingUnit: spacing1,
			spacingGridColumn: spacing3,
			spacingGridRow: spacing4,
			borderRadius: radiusSmall,
			focusBoxShadow: focusRingShadow,
			focusOutline: 'none'
		},
		rules: {
			'.Input': {
				backgroundColor: colorBackground,
				border: `1px solid ${separator}`,
				borderRadius: radiusSmall,
				fontSize: fontSizeBase,
				fontFamily,
				padding: `${spacing3} ${spacing4}`,
				minHeight: spacing11,
				transition: transitionAll,
				color: colorText
			},
			'.Input:focus': {
				borderColor: colorPrimary,
				boxShadow: focusRingShadow,
				outline: 'none',
				transform: 'none'
			},
			'.Input:hover': {
				borderColor: hoverPrimaryBorder
			},
			'.Input--invalid': {
				borderColor: colorDanger,
				boxShadow: `0 0 0 ${focusRingWidth} ${withOpacity(colorDanger, 0.15)}`
			},
			'.Input--complete': {
				borderColor: colorSuccess
			},
			'.Input:disabled': {
				backgroundColor: fillDisabled,
				borderColor: fillPrimary,
				color: colorTextPlaceholder,
				cursor: 'not-allowed'
			},
			'.Label': {
				fontSize: fontSizeSm,
				fontWeight: fontWeightMedium,
				fontFamily,
				color: colorText,
				marginBottom: spacing1_5,
				lineHeight
			},
			'.Tab': {
				backgroundColor: fillSecondary,
				borderRadius: radiusSmall,
				border: `1px solid ${separator}`,
				padding: `${spacing3} ${spacing4}`,
				minHeight: spacing11,
				fontSize: fontSizeBase,
				fontFamily,
				transition: transitionAll,
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: colorText
			},
			'.Tab:hover': {
				backgroundColor: fillPrimary,
				borderColor: hoverPrimaryBorder
			},
			'.Tab--selected': {
				backgroundColor: withOpacity(colorPrimary, 0.1),
				borderColor: colorPrimary,
				color: colorPrimary,
				fontWeight: fontWeightMedium
			},
			'.Tab--selected:hover': {
				backgroundColor: withOpacity(colorPrimary, 0.15)
			},
			'.Error': {
				color: colorDanger,
				fontSize: fontSizeSm,
				fontFamily,
				marginTop: spacing1_5,
				lineHeight,
				fontWeight: fontWeightNormal
			},
			'.Block': {
				backgroundColor: colorBackground,
				borderRadius: radiusSmall,
				padding: '0'
			},
			'.BlockDivider': {
				backgroundColor: separator,
				height: '1px',
				margin: `${spacing4} 0`
			},
			'.Spinner': {
				color: colorPrimary
			},
			'.Checkbox': {
				backgroundColor: colorBackground,
				borderColor: separator,
				borderRadius: radiusSm
			},
			'.Checkbox--checked': {
				backgroundColor: colorPrimary,
				borderColor: colorPrimary
			},
			'.Radio': {
				backgroundColor: colorBackground,
				borderColor: separator
			},
			'.Radio--checked': {
				backgroundColor: colorPrimary,
				borderColor: colorPrimary
			},
			'.StepperIcon': {
				backgroundColor: fillPrimary,
				color: colorTextSecondary
			},
			'.StepperIcon--completed': {
				backgroundColor: colorPrimary,
				color: colorBackground
			},
			'.Stepper': {
				gap: spacing2
			}
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const observeTheme = (onChange: () => void) => {
	if (typeof window === 'undefined') {
		return () => {}
	}

	const root = document.documentElement
	const observer = new MutationObserver(() => {
		onChange()
	})

	observer.observe(root, {
		attributes: true,
		attributeFilter: ['data-theme']
	})

	return () => observer.disconnect()
}

interface StripeProviderProps {
	children: React.ReactNode
	priceId?: string
	mode?: 'payment' | 'subscription' | 'setup'
}

export function StripeProvider({
	children,
	priceId,
	mode = 'subscription'
}: StripeProviderProps) {
	// Note: Appearance customization for Embedded Checkout is done through the Stripe Dashboard
	// The buildStripeAppearance function is kept for potential future use with Elements

	const { mutateAsync: createClientSecret } = useMutation({
		mutationFn: async () => {
			const response = await apiClient<StripeCheckoutSessionResponse>(
				`${API_BASE_URL}/api/v1/stripe/create-embedded-checkout-session`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						priceId,
						domain: window.location.origin,
						mode
					})
				}
			)

			return response.client_secret
		}
	})

	const fetchClientSecret = useCallback(async () => {
		return createClientSecret()
	}, [createClientSecret])

	// Embedded Checkout only accepts fetchClientSecret
	// Appearance customization is done through the Stripe Dashboard
	const options = useMemo(
		() => ({
			fetchClientSecret
		}),
		[fetchClientSecret]
	)

	return (
		<EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
			{children}
		</EmbeddedCheckoutProvider>
	)
}

StripeProvider.displayName = 'StripeProvider'
