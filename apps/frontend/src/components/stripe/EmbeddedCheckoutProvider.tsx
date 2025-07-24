// import { EmbeddedCheckoutProvider as StripeEmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
// import { loadStripe } from '@stripe/stripe-js'
import type { ReactNode } from 'react'

// Initialize Stripe
// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

interface EmbeddedCheckoutProviderProps {
    children: ReactNode
    options: {
        clientSecret: string
        onComplete?: () => void
    }
}

/**
 * Provider component for Stripe's Embedded Checkout
 * Provides context for embedded checkout components
 * 
 * COMMENTED OUT: This is a GitHub example that needs proper integration
 */
export function EmbeddedCheckoutProvider({ children }: EmbeddedCheckoutProviderProps) {
    return <>{children}</>
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