import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { ReactNode } from 'react'

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string
)

interface StripeProviderProps {
  children: ReactNode
}

export function StripeProvider({ children }: StripeProviderProps) {
  return (
    <Elements 
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#2563eb', // Blue-600 to match theme
            colorBackground: '#ffffff',
            colorText: '#111827',
            colorDanger: '#dc2626',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '6px',
          },
          rules: {
            '.Tab': {
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            },
            '.Tab:hover': {
              backgroundColor: '#f3f4f6',
            },
            '.Tab--selected': {
              backgroundColor: '#2563eb',
              color: '#ffffff',
            },
          },
        },
        locale: 'en',
        fonts: [
          {
            cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
          },
        ],
      }}
    >
      {children}
    </Elements>
  )
}