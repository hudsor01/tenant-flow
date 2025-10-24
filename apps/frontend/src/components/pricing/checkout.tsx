'use client'

import { CardLayout } from '@/components/ui/card-layout'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { EmbeddedCheckout } from '@stripe/react-stripe-js'

const logger = createLogger({ component: 'Checkout' })

interface CheckoutProps {
	className?: string
}

/**
 * Stripe Embedded Checkout Component
 * Uses the full Stripe-hosted checkout experience
 * Requires EmbeddedCheckoutProvider wrapper
 */
export function Checkout({ className }: CheckoutProps) {
	// Log that checkout component mounted
	logger.info('Checkout component mounted', {
	action: 'checkout_mounted'
	})

	// The EmbeddedCheckout component handles all the logic internally
	// It will automatically render the Stripe checkout UI when the session is ready
	return (
		<CardLayout
			title="Checkout"
			description="Complete your payment securely"
			className={`border-[var(--color-border)] shadow-sm min-h-150 ${className || ''}`}
		>
			<EmbeddedCheckout />
		</CardLayout>
	)
}

Checkout.displayName = 'Checkout'
