import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Loader2, CreditCard } from 'lucide-react'
import { useCheckout } from '@/hooks/useCheckout'
import type { PLAN_TYPE } from '@repo/shared'
import { getPlanWithUIMapping } from '@/lib/subscription-utils'

interface SubscriptionCheckoutProps {
	planType: keyof typeof PLAN_TYPE
	billingInterval: 'monthly' | 'annual'
	onSuccess?: (subscriptionId: string) => void
	onCancel?: () => void
}

/**
 * Integrated Subscription Checkout Component
 *
 * Combines your styled PaymentElement with direct subscription creation.
 * Uses the official Stripe pattern: create subscription with payment_behavior: 'default_incomplete'
 * then confirm payment with Elements.
 */
export function SubscriptionCheckout({
	planType,
	billingInterval,
	onSuccess: _onSuccess,
	onCancel
}: SubscriptionCheckoutProps) {
	const stripe = useStripe()
	const elements = useElements()
	const { createCheckoutSession, isLoading, error } = useCheckout()

	const [billingName, setBillingName] = useState('')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [isProcessing, setIsProcessing] = useState(false)

	// Get plan details for display
	const plan = getPlanWithUIMapping(planType)
	const price =
		billingInterval === 'annual' ? plan?.price.annual : plan?.price.monthly

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!stripe || !elements) {
			setErrorMessage('Stripe has not loaded yet. Please try again.')
			return
		}

		if (!billingName.trim()) {
			setErrorMessage('Please enter your billing name.')
			return
		}

		setIsProcessing(true)
		setErrorMessage(null)

		try {
			// Use checkout session flow instead of direct subscription
			await createCheckoutSession(
				planType,
				billingInterval === 'annual' ? 'yearly' : 'monthly'
			)
			// The checkout session will redirect to Stripe
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'An unexpected error occurred'
			setErrorMessage(message)
		} finally {
			setIsProcessing(false)
		}
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="flex items-center justify-center gap-2">
					<CreditCard className="h-5 w-5" />
					Subscribe to {plan?.name}
				</CardTitle>
				<CardDescription>
					{price && (
						<span className="text-lg font-semibold">
							${price}/
							{billingInterval === 'annual' ? 'year' : 'month'}
						</span>
					)}
					<br />
					Secure checkout powered by Stripe
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form
					onSubmit={e => void handleSubmit(e)}
					className="space-y-6"
				>
					{/* Billing Name Input */}
					<div className="space-y-2">
						<Label htmlFor="billingName">Billing Name</Label>
						<Input
							id="billingName"
							type="text"
							placeholder="Enter your full name"
							value={billingName}
							onChange={e => setBillingName(e.target.value)}
							disabled={isProcessing || isLoading}
							required
						/>
					</div>

					{/* Payment Element with your styling */}
					<div className="border-border bg-card rounded-xl border p-6 shadow-sm">
						<PaymentElement
							options={{
								layout: {
									type: 'tabs',
									defaultCollapsed: false,
									spacedAccordionItems: true
								},
								fields: {
									billingDetails: {
										name: 'auto',
										email: 'auto',
										phone: 'never',
										address: {
											country: 'auto',
											postalCode: 'auto'
										}
									}
								},
								terms: {
									card: 'auto',
									applePay: 'auto',
									googlePay: 'auto'
								},
								wallets: {
									applePay: 'auto',
									googlePay: 'auto'
								},
								business: {
									name: 'TenantFlow'
								},
								paymentMethodOrder: [
									'card',
									'apple_pay',
									'google_pay',
									'link',
									'paypal'
								]
							}}
						/>
					</div>

					{/* Error message */}
					{(errorMessage || error) && (
						<Alert variant="destructive">
							<AlertDescription>
								{errorMessage || error}
							</AlertDescription>
						</Alert>
					)}

					{/* Action buttons */}
					<div className="flex gap-3">
						{onCancel && (
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isProcessing || isLoading}
								className="flex-1"
							>
								Cancel
							</Button>
						)}

						<Button
							type="submit"
							disabled={!stripe || isProcessing || isLoading}
							className="bg-gradient-steel-soft hover:bg-gradient-steel-deep flex-1 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
							size="lg"
						>
							{isProcessing || isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Processing...
								</>
							) : (
								`Subscribe for $${price}/${billingInterval === 'annual' ? 'year' : 'month'}`
							)}
						</Button>
					</div>

					{/* Security badge */}
					<div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
						<svg
							className="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							/>
						</svg>
						<span>256-bit SSL encryption</span>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
