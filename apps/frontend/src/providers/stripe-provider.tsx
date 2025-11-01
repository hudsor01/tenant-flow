'use client'

import { useCallback, useMemo } from 'react'

import { EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useMutation } from '@tanstack/react-query'

import { API_BASE_URL } from '#lib/api-config'
import type { StripeCheckoutSessionResponse } from '@repo/shared/types/core'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!publishableKey) {
	throw new Error(
		'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required to initialise Stripe.'
	)
}

const stripePromise = loadStripe(publishableKey)

interface StripeProviderProps {
	children: React.ReactNode
	priceId?: string
	mode?: 'payment' | 'subscription' | 'setup'
}

export function StripeProvider({
	children,
	priceId,
	mode = 'subscription'
}: StripeProviderProps) {
	const { mutateAsync: createClientSecret } = useMutation({
		mutationFn: async () => {
			const res = await fetch(
				`${API_BASE_URL}/api/v1/stripe/create-embedded-checkout-session`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({
						priceId,
						domain: window.location.origin,
						mode
				})
			}
		)

		if (!res.ok) {
			throw new Error('Failed to create checkout session')
		}

		const response = (await res.json()) as StripeCheckoutSessionResponse

		return response.client_secret
		}
	})

	const fetchClientSecret = useCallback(async () => {
		return createClientSecret()
	}, [createClientSecret])

	// Embedded Checkout only accepts fetchClientSecret
	// Appearance customization is done through the Stripe Dashboard
	const options = useMemo(
		() => ({
			fetchClientSecret
		}),
		[fetchClientSecret]
	)

	return (
		<EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
			{children}
		</EmbeddedCheckoutProvider>
	)
}

StripeProvider.displayName = 'StripeProvider'
