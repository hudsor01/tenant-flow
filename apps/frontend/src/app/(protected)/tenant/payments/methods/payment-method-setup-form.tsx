'use client'

import { Spinner } from '@/components/ui/spinner'
import {
	Elements,
	PaymentElement,
	useElements,
	useStripe
} from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface PaymentMethodSetupFormProps {
	clientSecret: string
	onSuccess: (paymentMethodId: string) => void
	onError?: (error: Error) => void
}

/**
 * Inner form component that uses Stripe hooks
 * Must be wrapped in Elements provider
 */
function SetupForm({
	onSuccess,
	onError
}: {
	onSuccess: (paymentMethodId: string) => void
	onError?: (error: Error) => void
}) {
	const stripe = useStripe()
	const elements = useElements()
	const [isProcessing, setIsProcessing] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!stripe || !elements) {
			toast.error('Stripe not loaded')
			return
		}

		setIsProcessing(true)

		try {
			const { error, setupIntent } = await stripe.confirmSetup({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/settings/payment-methods/complete`
				},
				redirect: 'if_required' // Only redirect if payment method requires it (e.g., bank redirect)
			})

			if (error) {
				const errorMessage = error.message || 'Failed to save payment method'
				toast.error(errorMessage)
				onError?.(new Error(errorMessage))
			} else if (setupIntent) {
				const paymentMethodId =
					typeof setupIntent.payment_method === 'string'
						? setupIntent.payment_method
						: setupIntent.payment_method?.id

				if (!paymentMethodId) {
					const message =
						'Payment method confirmation succeeded but no identifier returned'
					toast.error(message)
					onError?.(new Error(message))
					return
				}

				toast.success('Payment method saved successfully')
				onSuccess(paymentMethodId)
			}
		} catch (err) {
			const error = err as Error
			toast.error(error.message || 'An unexpected error occurred')
			onError?.(error)
		} finally {
			setIsProcessing(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Stripe's pre-built Payment Element - handles card + ACH + validation */}
			<PaymentElement
				options={{
					layout: 'tabs',
					defaultValues: {
						billingDetails: {
							name: '',
							email: ''
						}
					}
				}}
			/>

			<Button
				type="submit"
				disabled={isProcessing || !stripe || !elements}
				className="w-full"
			>
				{isProcessing ? (
					<>
						<Spinner className="mr-2 size-4 animate-spin" />
						Saving...
					</>
				) : (
					'Save Payment Method'
				)}
			</Button>
		</form>
	)
}

/**
 * PaymentMethodSetupForm - Wrapper component with Elements provider
 *
 * Uses Stripe's official pre-built PaymentElement for collecting payment methods.
 * Supports both card and ACH bank accounts with instant verification via Financial Connections.
 *
 * @param clientSecret - SetupIntent client secret from backend
 * @param onSuccess - Callback when payment method is saved successfully
 * @param onError - Optional error handler
 */
export function PaymentMethodSetupForm({
	clientSecret,
	onSuccess,
	onError
}: PaymentMethodSetupFormProps) {
	const options: StripeElementsOptions = {
		clientSecret,
		appearance: {
			theme: 'stripe',
			variables: {
				colorPrimary: 'oklch(var(--primary))',
				colorBackground: 'oklch(var(--background))',
				colorText: 'oklch(var(--foreground))',
				colorDanger: 'oklch(var(--destructive))',
				fontFamily: 'var(--font-roboto-flex), system-ui, sans-serif',
				borderRadius: 'var(--radius)'
			}
		}
	}

	return (
		<Elements stripe={stripePromise} options={options}>
			<SetupForm onSuccess={onSuccess} {...(onError ? { onError } : {})} />
		</Elements>
	)
}
