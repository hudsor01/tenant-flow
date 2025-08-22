// import { EmbeddedCheckout as StripeEmbeddedCheckout } from '@stripe/react-stripe-js'

// interface EmbeddedCheckoutProps {
//     clientSecret: string
//     onComplete?: () => void
// }

import { loadStripe } from '@stripe/stripe-js'
import { 
	EmbeddedCheckoutProvider, 
	EmbeddedCheckout as StripeEmbeddedCheckout 
} from '@stripe/react-stripe-js'
import { useCallback } from 'react'

interface EmbeddedCheckoutProps {
	clientSecret?: string
	onComplete?: () => void
}

/**
 * Wrapper component for Stripe's Embedded Checkout
 * Provides a complete checkout experience within your app
 */
export function EmbeddedCheckout({ clientSecret, onComplete: _onComplete }: EmbeddedCheckoutProps) {
	// Initialize Stripe
	const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

	const fetchClientSecret = useCallback(async () => {
		if (clientSecret) return clientSecret
		
		// Fetch client secret from your backend
		const response = await fetch('/api/create-checkout-session', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		})
		
		const data = await response.json()
		return data.clientSecret
	}, [clientSecret])

	if (!stripePromise) {
		return <div>Loading Stripe...</div>
	}

	return (
		<div className="embedded-checkout-container">
			<EmbeddedCheckoutProvider
				stripe={stripePromise}
				options={{ fetchClientSecret }}
			>
				<StripeEmbeddedCheckout />
			</EmbeddedCheckoutProvider>
		</div>
	)
}

// export function EmbeddedCheckout({ clientSecret, onComplete }: EmbeddedCheckoutProps) {
//     return (
//         <StripeEmbeddedCheckout
//             options={{ clientSecret }}
//             onComplete={onComplete}
//         />
//     )
// }
