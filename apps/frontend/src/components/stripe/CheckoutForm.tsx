/**
 * Stripe Checkout Form
 * Complete checkout experience with provider and form
 * Direct implementation without abstractions
 */
'use client'

import { CheckoutProvider } from './CheckoutProvider'
import { Checkout } from './Checkout'

export interface CheckoutFormProps {
	clientSecret: string
	onSuccess?: () => void
	onError?: (error: string) => void
	className?: string
}

/**
 * Complete Stripe Checkout Form
 * Combines CheckoutProvider and Checkout component
 *
 * This is a convenience wrapper for simple use cases
 * For more control, use CheckoutProvider and Checkout separately
 */
export function CheckoutForm({
	clientSecret,
	onSuccess,
	onError,
	className = ''
}: CheckoutFormProps) {
	return (
		<CheckoutProvider
			fetchClientSecret={async () => clientSecret}
			elementsOptions={{
				appearance: {
					theme: 'stripe',
					variables: {
						colorPrimary: '#0070f3'
					}
				}
			}}
		>
			<Checkout
				onSuccess={onSuccess}
				onError={onError}
				className={className}
			/>
		</CheckoutProvider>
	)
}
