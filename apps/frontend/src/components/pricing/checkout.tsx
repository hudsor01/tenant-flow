'use client'

import { Card, CardContent } from '@/components/ui/card'
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
		<Card
			className={`border-[var(--color-border)] shadow-sm min-h-[600px] ${className || ''}`}
		>
			<CardContent className="p-0">
				<EmbeddedCheckout />
			</CardContent>
		</Card>
	)
}

Checkout.displayName = 'Checkout'
