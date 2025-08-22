// import { EmbeddedCheckoutProvider as StripeEmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
// import { loadStripe } from '@stripe/stripe-js'
import type { ReactNode } from 'react'

// Initialize Stripe
// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface EmbeddedCheckoutProviderProps {
	children: ReactNode
	options: {
		clientSecret: string
		onComplete?: () => void
	}
}

import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

/**
 * Provider component for Stripe's Embedded Checkout
 * Provides Stripe context for embedded checkout components
 */
export function EmbeddedCheckoutProvider({
	children
}: EmbeddedCheckoutProviderProps) {
	return (
		<Elements 
			stripe={stripePromise}
			options={{
				mode: 'payment',
				currency: 'usd',
				appearance: {
					theme: 'stripe',
				},
			}}
		>
			{children}
		</Elements>
	)
}

// export function EmbeddedCheckoutProvider({ children, options }: EmbeddedCheckoutProviderProps) {
//     return (
//         <StripeEmbeddedCheckoutProvider
//             stripe={stripePromise}
//             options={options}
//         >
//             {children}
//         </StripeEmbeddedCheckoutProvider>
//     )
// }
