'use client'

import { createPaymentIntent } from '@/lib/stripe-client'
import { useElements, useStripe } from '@stripe/react-stripe-js'
import type { PaymentIntent, StripeError } from '@stripe/stripe-js'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

export type CheckoutStatus = 'idle' | 'processing' | 'succeeded' | 'failed'

export type UseCheckoutOptions = {
	amount: number
	currency?: string
	metadata?: Record<string, string>
	customerEmail?: string
	onSuccess?: (pi: PaymentIntent) => void
	onError?: (error: StripeError | Error) => void
}

export function useCheckout({
	amount,
	currency = 'usd',
	metadata = {},
	customerEmail,
	onSuccess,
	onError
}: UseCheckoutOptions) {
	const formatAmount = useCallback(
		(cents: number) => {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: currency.toUpperCase()
			}).format(cents / 100)
		},
		[currency]
	)
	const stripe = useStripe()
	const elements = useElements()

	const [status, setStatus] = useState<CheckoutStatus>('idle')
	const [error, setError] = useState<string>('')
	const [isProcessing, setIsProcessing] = useState(false)

	const paymentIntentMutation = useMutation({
		mutationFn: async () => {
			if (amount < 50) throw new Error('Amount must be at least $0.50')
			return createPaymentIntent({ amount, currency, metadata, customerEmail })
		}
	})

	useEffect(() => {
		if (amount && currency) {
			paymentIntentMutation.mutate()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [amount, currency, customerEmail, JSON.stringify(metadata)])

	const confirmPayment = useCallback(async () => {
		if (!stripe || !elements || !paymentIntentMutation.data?.clientSecret) {
			setError('Payment system not ready. Please try again.')
			return
		}

		setIsProcessing(true)
		setStatus('processing')
		setError('')

		const { error: submitError, paymentIntent } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/pricing/success`,
				receipt_email: customerEmail
			},
			redirect: 'if_required'
		})

		if (submitError) {
			setStatus('failed')
			setError(submitError.message || 'Payment failed')
			onError?.(submitError)
			setIsProcessing(false)
			return
		}

		if (paymentIntent) {
			if (paymentIntent.status === 'succeeded') {
				setStatus('succeeded')
				onSuccess?.(paymentIntent)
			} else if (paymentIntent.status === 'requires_payment_method') {
				setStatus('failed')
				setError('Payment failed. Please try a different payment method.')
			}
		}

		setIsProcessing(false)
	}, [
		stripe,
		elements,
		paymentIntentMutation.data,
		customerEmail,
		onError,
		onSuccess
	])

	const reset = useCallback(() => {
		setError('')
		setStatus('idle')
		paymentIntentMutation.reset()
		paymentIntentMutation.mutate()
	}, [paymentIntentMutation])

	return {
		stripe,
		elements,
		clientSecret: paymentIntentMutation.data?.clientSecret,
		isLoading: paymentIntentMutation.isPending,
		isProcessing,
		status,
		error,
		confirmPayment,
		reset
	}
}
