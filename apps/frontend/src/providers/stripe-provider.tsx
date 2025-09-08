'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface StripeContextValue {
	stripe: any | null
	elements: any | null
	isLoading: boolean
}

const StripeContext = createContext<StripeContextValue>({
	stripe: null,
	elements: null,
	isLoading: true
})

export function StripeProvider({ children }: { children: React.ReactNode }) {
	const [stripe, setStripe] = useState<any>(null)
	const [elements, setElements] = useState<any>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const loadStripe = async () => {
			try {
				if (typeof window === 'undefined') return

				if ((window as any).Stripe) {
					const stripeInstance = (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
					setStripe(stripeInstance)
					const elementsInstance = stripeInstance.elements()
					setElements(elementsInstance)
				} else {
					const script = document.createElement('script')
					script.src = 'https://js.stripe.com/v3/'
					script.onload = () => {
						const stripeInstance = (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
						setStripe(stripeInstance)
						const elementsInstance = stripeInstance.elements()
						setElements(elementsInstance)
					}
					document.head.appendChild(script)
				}
			} catch (error) {
				console.error('Failed to load Stripe:', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadStripe()
	}, [])

	return (
		<StripeContext.Provider value={{ stripe, elements, isLoading }}>
			{children}
		</StripeContext.Provider>
	)
}

export const useStripe = () => {
	const context = useContext(StripeContext)
	if (!context) {
		throw new Error('useStripe must be used within a StripeProvider')
	}
	return context
}

StripeProvider.displayName = 'StripeProvider'
