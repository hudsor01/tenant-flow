/**
 * Stripe Checkout Component
 * Uses PaymentElement with the new Checkout API
 * Direct implementation without abstractions
 */
'use client'

import {
	PaymentElement,
	useCheckout,
	useStripe,
	useElements
} from '@stripe/react-stripe-js'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
export interface CheckoutProps {
	onSuccess?: () => void
	onError?: (error: string) => void
	className?: string
}

/**
 * Stripe Checkout Component
 * Renders PaymentElement for checkout
 * Must be used within CheckoutProvider
 *
 * Uses the new Checkout API with PaymentElement for maximum flexibility
 */
export function Checkout({
	onSuccess,
	onError,
	className = ''
}: CheckoutProps) {
	const stripe = useStripe()
	const elements = useElements()
	const checkout = useCheckout()
	const [isProcessing, setIsProcessing] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()

		if (!stripe || !elements || !checkout) {
			return
		}

		setIsProcessing(true)
		setErrorMessage(null)

		try {
			// Confirm the payment using the checkout session
			const _result = await checkout.confirm({
				redirect: 'if_required' // Stay on page if possible
			})

			// Check the _result type
			if (_result.type === 'error') {
				const errorMessage = 'Payment failed'
				setErrorMessage(errorMessage)
				onError?.(errorMessage)
			} else if (_result.type === 'success') {
				// Payment succeeded
				onSuccess?.()
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Payment failed'
			setErrorMessage(message)
			onError?.(message)
		} finally {
			setIsProcessing(false)
		}
	}

	if (!checkout) {
		return (
			<div
				className={`flex items-center justify-center p-8 ${className}`}
			>
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
			</div>
		)
	}

	return (
		<form onSubmit={handleSubmit} className={className}>
			<PaymentElement
				options={{
					layout: 'tabs',
					paymentMethodOrder: ['card', 'apple_pay', 'google_pay']
				}}
			/>

			{errorMessage && (
				<div className="mt-4 rounded-lg border border-red-2 bg-red-50 p-3 text-sm text-red-700">
					{errorMessage}
				</div>
			)}

			<Button
				type="submit"
				disabled={!stripe || isProcessing}
				className="mt-6 w-full"
			>
				{isProcessing ? (
					<>
						<Loader2 className=" mr-2 h-4 w-4 animate-spin"  />
						Processing...
					</>
				) : (
					'Pay Now'
				)}
			</Button>
		</form>
	)
}
