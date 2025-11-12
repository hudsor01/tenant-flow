'use client'

import { useCallback, useMemo } from 'react'

import { EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useMutation } from '@tanstack/react-query'

import { clientFetch } from '#lib/api/client'
import type { StripeCheckoutSessionResponse } from '@repo/shared/types/core'
import { useModalMutation } from '../hooks/use-modal-mutation'

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
	modalId?: string
}

export function StripeProvider({
	children,
	priceId,
	mode = 'subscription',
	modalId
}: StripeProviderProps) {
	const modalMutationOptions = useModalMutation<string, unknown, void>({
		mutationFn: async () => {
			const response = await clientFetch<StripeCheckoutSessionResponse>(
				'/api/v1/stripe/create-embedded-checkout-session',
				{
					method: 'POST',
					body: JSON.stringify({
						priceId,
						domain: window.location.origin,
						mode
					})
				}
			)

			return response.client_secret
		},
		modalId
	})

	const { mutateAsync: createClientSecret } = useMutation(modalMutationOptions)

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
