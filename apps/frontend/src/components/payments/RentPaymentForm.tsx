import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
	Elements,
	PaymentElement,
	ExpressCheckoutElement,
	useStripe,
	useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { trpc } from '@/lib/trpcClient'
import { logger } from '@/lib/logger'
import { CreditCard, DollarSign, Shield } from 'lucide-react'
import { toast } from 'sonner'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!, {
	stripeAccount: undefined // For connect accounts if needed later
})

interface RentPaymentFormProps {
	leaseId: string
	rentAmount: number
	propertyName: string
	dueDate: string
}

function PaymentForm({
	leaseId,
	rentAmount,
	propertyName,
	dueDate
}: RentPaymentFormProps) {
	const stripe = useStripe()
	const elements = useElements()
	const [isProcessing, setIsProcessing] = useState(false)
	const [paymentAmount, setPaymentAmount] = useState(rentAmount)
	const [clientSecret, setClientSecret] = useState<string | null>(null)
	const [showExpressCheckout] = useState(true)

	// Calculate TenantFlow processing fee (3% + $0.30)
	const processingFee = Math.round((paymentAmount * 0.03 + 0.3) * 100) / 100
	const totalAmount = paymentAmount + processingFee

	const createPaymentIntent = React.useCallback(async () => {
		try {
			const paymentIntent = await apiClient.http.post(
				'/payments/create-intent',
				{
					leaseId,
					amount: paymentAmount,
					processingFee,
					totalAmount
				}
			)

			setClientSecret((paymentIntent as { client_secret: string }).client_secret)
		} catch (error) {
			logger.error(
				'Error creating payment intent for rent payment',
				error as Error
			)
			toast.error('Failed to initialize payment. Please try again.')
		}
	}, [leaseId, paymentAmount, processingFee, totalAmount])

	// Create payment intent when amount changes
	React.useEffect(() => {
		if (paymentAmount > 0) {
			createPaymentIntent()
		}
	}, [paymentAmount, createPaymentIntent])

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()

		if (!stripe || !elements || !clientSecret) {
			toast.error(
				'Payment system not loaded. Please refresh and try again.'
			)
			return
		}

		setIsProcessing(true)

		try {
			// Confirm payment with PaymentElement
			const { error: confirmError } = await stripe.confirmPayment({
				elements: elements!,
				confirmParams: {
					return_url: `${window.location.origin}/tenant/payments?payment=success`
				},
				redirect: 'if_required'
			})

			if (confirmError) {
				// Enhanced error handling
				if (confirmError.type === 'card_error') {
					toast.error(`Card Error: ${confirmError.message}`)
				} else if (confirmError.type === 'validation_error') {
					toast.error(`Validation Error: ${confirmError.message}`)
				} else {
					toast.error(confirmError.message || 'Payment failed')
				}
				return
			}

			// Payment succeeded
			toast.success(
				'Rent payment successful! Your landlord has been notified.'
			)
			setPaymentAmount(rentAmount)
			setClientSecret(null)
			// Recreate payment intent for next payment
			setTimeout(() => createPaymentIntent(), 1000)
		} catch (error) {
			logger.error('Rent payment failed', error as Error)
			toast.error(
				error instanceof Error
					? error.message
					: 'Payment failed. Please try again.'
			)
		} finally {
			setIsProcessing(false)
		}
	}

	const handleExpressCheckout = async () => {
		if (!stripe || !clientSecret) return

		setIsProcessing(true)
		try {
			const { error: confirmError } = await stripe.confirmPayment({
				elements: elements!,
				confirmParams: {
					return_url: `${window.location.origin}/tenant/payments?payment=success`
				},
				redirect: 'if_required'
			})

			if (confirmError) {
				toast.error(confirmError.message || 'Payment failed')
			} else {
				toast.success('Rent payment successful!')
			}
		} catch {
			toast.error('Express checkout failed')
		} finally {
			setIsProcessing(false)
		}
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="h-5 w-5" />
					Pay Rent - {propertyName}
				</CardTitle>
				<p className="text-muted-foreground text-sm">Due: {dueDate}</p>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Payment Amount */}
					<div className="space-y-2">
						<Label htmlFor="amount">Payment Amount</Label>
						<div className="relative">
							<DollarSign className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
							<Input
								id="amount"
								type="number"
								step="0.01"
								min="0"
								value={paymentAmount}
								onChange={e =>
									setPaymentAmount(
										parseFloat(e.target.value) || 0
									)
								}
								className="pl-9"
								placeholder="Enter amount"
							/>
						</div>
					</div>

					{/* Fee Breakdown */}
					<div className="bg-muted/30 space-y-1 rounded-lg p-3 text-sm">
						<div className="flex justify-between">
							<span>Rent Amount:</span>
							<span>${paymentAmount.toFixed(2)}</span>
						</div>
						<div className="text-muted-foreground flex justify-between">
							<span>Processing Fee:</span>
							<span>${processingFee.toFixed(2)}</span>
						</div>
						<hr className="my-2" />
						<div className="flex justify-between font-semibold">
							<span>Total:</span>
							<span>${totalAmount.toFixed(2)}</span>
						</div>
					</div>

					{/* Express Checkout */}
					{showExpressCheckout && clientSecret && (
						<div className="space-y-3">
							<ExpressCheckoutElement
								onConfirm={handleExpressCheckout}
								options={{
									buttonType: {
										applePay: 'plain',
										googlePay: 'plain'
									},
									paymentMethods: {
										applePay: 'auto',
										googlePay: 'auto'
									}
								}}
							/>
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-background text-muted-foreground px-2">
										Or pay with card
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Payment Element */}
					{clientSecret && (
						<div className="space-y-2">
							<Label>Payment Information</Label>
							<PaymentElement
								options={{
									layout: 'tabs',
									wallets: {
										applePay: 'auto',
										googlePay: 'auto'
									},
									fields: {
										billingDetails: {
											name: 'auto',
											email: 'auto',
											phone: 'auto',
											address: {
												country: 'auto',
												line1: 'auto',
												line2: 'auto',
												city: 'auto',
												state: 'auto',
												postalCode: 'auto'
											}
										}
									}
								}}
							/>
						</div>
					)}

					{/* Security Notice */}
					<div className="text-muted-foreground flex items-center gap-2 text-xs">
						<Shield className="h-3 w-3" />
						<span>
							Your payment is secured by Stripe. We never store
							your card information.
						</span>
					</div>

					{/* Submit Button */}
					<Button
						type="submit"
						className="w-full"
						disabled={!stripe || !clientSecret || isProcessing}
					>
						{isProcessing
							? 'Processing...'
							: `Pay $${totalAmount.toFixed(2)}`}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}

export default function RentPaymentForm(props: RentPaymentFormProps) {
	const options = {
		appearance: {
			theme: 'stripe' as const,
			variables: {
				colorPrimary: 'hsl(var(--primary))',
				colorBackground: 'hsl(var(--background))',
				colorText: 'hsl(var(--foreground))',
				colorDanger: 'hsl(var(--destructive))',
				fontFamily: 'system-ui, sans-serif',
				spacingUnit: '4px',
				borderRadius: '6px'
			},
			labels: 'floating' as const
		},
		loader: 'auto' as const
	}

	return (
		<Elements stripe={stripePromise} options={options}>
			<PaymentForm {...props} />
		</Elements>
	)
}
