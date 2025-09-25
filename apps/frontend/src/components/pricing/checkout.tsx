'use client'

import { EmbeddedCheckout } from '@stripe/react-stripe-js'
import { Card, CardContent } from '@/components/ui/card'
import { createLogger } from '@repo/shared'

const logger = createLogger({ component: 'Checkout' })

interface CheckoutProps {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

/**
 * Stripe Embedded Checkout Component
 * Uses the full Stripe-hosted checkout experience
 * Requires EmbeddedCheckoutProvider wrapper
 */
export function Checkout({ onSuccess, onError }: CheckoutProps) {
	// Log that checkout component mounted
	logger.info('Checkout component mounted', {
		action: 'checkout_mounted'
	})

	// Handle checkout completion callbacks
	const handleComplete = () => {
		logger.info('Checkout completed successfully')
		onSuccess?.()
	}

	const handleError = (error: Error) => {
		logger.error('Checkout error occurred', { error: error.message })
		onError?.(error)
	}

	// The EmbeddedCheckout component handles all the logic internally
	// It will automatically render the Stripe checkout UI when the session is ready
	return (
		<Card className="border-[var(--color-border)] shadow-sm min-h-[600px]">
			<CardContent className="p-0">
				<EmbeddedCheckout
					onComplete={handleComplete}
					onError={handleError}
				/>
			</CardContent>
		</Card>
	)
}

Checkout.displayName = 'Checkout'