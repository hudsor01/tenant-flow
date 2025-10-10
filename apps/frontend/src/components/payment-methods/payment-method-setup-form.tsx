'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { PaymentMethodType } from '@repo/shared/types/core'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'

interface PaymentMethodSetupFormProps {
	paymentMethodType: PaymentMethodType
	onSuccess: () => void
	onCancel: () => void
}

export function PaymentMethodSetupForm({
	paymentMethodType,
	onSuccess,
	onCancel
}: PaymentMethodSetupFormProps) {
	const stripe = useStripe()
	const elements = useElements()

	const [isProcessing, setIsProcessing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!stripe || !elements) {
			return
		}

		setIsProcessing(true)
		setError(null)

		try {
			const { error: submitError } = await stripe.confirmSetup({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/settings/payment-methods/success`
				},
				redirect: 'if_required'
			})

			if (submitError) {
				setError(submitError.message || 'An error occurred')
			} else {
				// Success - payment method saved
				onSuccess()
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'An unexpected error occurred'
			)
		} finally {
			setIsProcessing(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<PaymentElement
				options={{
					layout: 'tabs',
					paymentMethodOrder: [paymentMethodType]
				}}
			/>

			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isProcessing}
					className="flex-1"
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={!stripe || isProcessing}
					className="flex-1"
				>
					{isProcessing ? (
						<>
							<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
							Processing...
						</>
					) : (
						'Save Payment Method'
					)}
				</Button>
			</div>
		</form>
	)
}
