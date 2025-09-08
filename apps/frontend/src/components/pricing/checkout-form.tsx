'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStripe } from '@/providers/stripe-provider'
import { Loader2 } from 'lucide-react'

interface CheckoutFormProps {
	amount: number
	currency?: string
	metadata?: Record<string, string>
	onSuccess?: (paymentIntent: any) => void
	onError?: (error: any) => void
}

export function CheckoutForm({
	amount,
	currency = 'usd',
	metadata = {},
	onSuccess,
	onError
}: CheckoutFormProps) {
	const { stripe, isLoading: stripeLoading } = useStripe()
	const [paymentElement, setPaymentElement] = useState<any>(null)
	const [clientSecret, setClientSecret] = useState<string>('')
	const [isProcessing, setIsProcessing] = useState(false)
	const [isLoadingPayment, setIsLoadingPayment] = useState(false)
	const [error, setError] = useState<string>('')

	useEffect(() => {
		const createPaymentIntent = async () => {
			if (amount < 50) {
				setError('Amount must be at least $0.50')
				return
			}

			setIsLoadingPayment(true)
			setError('')

			try {
				const response = await fetch('/api/create-payment-intent', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						amount,
						currency,
						metadata
					})
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || 'Failed to create payment intent')
				}

				const { clientSecret } = await response.json()
				setClientSecret(clientSecret)
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
				setError(errorMessage)
				onError?.(err)
			} finally {
				setIsLoadingPayment(false)
			}
		}

		createPaymentIntent()
	}, [amount, currency, metadata, onError])

	useEffect(() => {
		if (!stripe || !clientSecret || stripeLoading) return

		const initializePaymentElement = async () => {
			try {
				const elements = stripe.elements({
					clientSecret,
					locale: navigator.language || 'en'
				})

				const paymentElementInstance = elements.create('payment', {
					layout: 'tabs',
					paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
					fields: {
						billingDetails: {
							name: 'auto',
							email: 'auto'
						}
					}
				})

				setPaymentElement(paymentElementInstance)

				setTimeout(() => {
					const container = document.getElementById('payment-element')
					if (container && paymentElementInstance) {
						paymentElementInstance.mount('#payment-element')
					}
				}, 100)
			} catch (err) {
				console.error('Failed to initialize payment element:', err)
				setError('Failed to initialize payment form')
			}
		}

		initializePaymentElement()
	}, [stripe, clientSecret, stripeLoading])

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()

		if (!stripe || !paymentElement) {
			setError('Payment system not ready. Please try again.')
			return
		}

		setIsProcessing(true)
		setError('')

		try {
			const { error: submitError, paymentIntent } = await stripe.confirmPayment({
				elements: paymentElement.elements || { getElement: () => paymentElement },
				confirmParams: {
					return_url: `${window.location.origin}/pricing/success`
				},
				redirect: 'if_required'
			})

			if (submitError) {
				setError(submitError.message || 'Payment failed')
				onError?.(submitError)
			} else if (paymentIntent) {
				// Handle different PaymentIntent statuses
				switch (paymentIntent.status) {
					case 'succeeded':
						onSuccess?.(paymentIntent)
						break
					case 'processing':
						setError('Payment is processing. You will receive a confirmation email when complete.')
						break
					case 'requires_payment_method':
						setError('Payment failed. Please try a different payment method.')
						break
					case 'requires_action':
						setError('Additional authentication required. Please complete the verification.')
						break
					default:
						setError('Payment status: ' + paymentIntent.status)
				}
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Payment failed'
			setError(errorMessage)
			onError?.(err)
		} finally {
			setIsProcessing(false)
		}
	}

	const formatAmount = (cents: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase()
		}).format(cents / 100)
	}

	if (stripeLoading || isLoadingPayment) {
		return (
			<Card className="w-full max-w-md mx-auto">
				<CardContent className="flex items-center justify-center p-8">
					<div className="flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Loading payment form...</span>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (error && !clientSecret) {
		return (
			<Card className="w-full max-w-md mx-auto">
				<CardContent className="p-6">
					<div className="text-center">
						<p className="text-red-600 mb-4">{error}</p>
						<Button
							onClick={() => window.location.reload()}
							variant="outline"
						>
							Try Again
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader>
				<CardTitle>Complete Payment</CardTitle>
				<CardDescription>
					Total: {formatAmount(amount)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div id="payment-element" className="min-h-[200px]">
						{!clientSecret && (
							<div className="flex items-center justify-center h-[200px]">
								<Loader2 className="h-6 w-6 animate-spin" />
							</div>
						)}
					</div>
					
					{error && (
						<div className="text-sm text-red-600 bg-red-50 p-3 rounded">
							{error}
						</div>
					)}

					<Button
						type="submit"
						disabled={!stripe || !clientSecret || isProcessing}
						className="w-full"
					>
						{isProcessing ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Processing...
							</>
						) : (
							`Complete Payment ${formatAmount(amount)}`
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}