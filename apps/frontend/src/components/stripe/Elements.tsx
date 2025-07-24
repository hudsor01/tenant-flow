// import { Elements as StripeElements } from '@stripe/react-stripe-js'
// import { loadStripe } from '@stripe/stripe-js'
import type { ReactNode } from 'react'
// import type { StripeElementsOptions } from '@stripe/stripe-js'

// Initialize Stripe
// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

interface ElementsProps {
    children: ReactNode
    options?: unknown
}

/**
 * Wrapper component for Stripe Elements
 * Provides Stripe context to child components
 * 
 * COMMENTED OUT: This is a GitHub example that needs proper integration
 */
export function Elements({ children }: ElementsProps) {
    return <>{children}</>
}

// export function Elements({ children, options }: ElementsProps) {
//     return (
//         <StripeElements stripe={stripePromise} options={options}>
//             {children}
//         </StripeElements>
//     )
// }