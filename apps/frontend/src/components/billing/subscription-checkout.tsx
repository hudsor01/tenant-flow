import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import type { PLAN_TYPE } from '@repo/shared'
import { PLANS } from '@repo/shared'
import { post } from '@/lib/api-client'

interface SubscriptionCheckoutProps {
	planType: keyof typeof PLAN_TYPE
	billingInterval: 'monthly' | 'annual'
	onSuccess?: (_subscriptionId: string) => void
	onCancel?: () => void
}

/**
 * Modern Subscription Checkout Component (2025)
 *
 * Implements Stripe's latest best practices:
 * - Uses Confirmation Token pattern for security
 * - Embedded checkout (no redirects)
 * - Leverages Payment Element's native billing details collection
 * - Follows Stripe's official subscription integration guide
 */
export function SubscriptionCheckout({
	planType,
	billingInterval,
	onSuccess,
	onCancel
}: SubscriptionCheckoutProps) {
	const stripe = useStripe()
	const elements = useElements()

	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)

	// Get plan details for display
	const plan = PLANS.find(p => p.id === planType)
	const priceInCents =
		billingInterval === 'annual'
			? plan?.price?.annual
			: plan?.price?.monthly
	const price = priceInCents ? Math.floor(priceInCents / 100) : 0

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!stripe || !elements) {
			setErrorMessage('Stripe has not loaded yet. Please try again.')
			return
		}

		setIsProcessing(true)
		setErrorMessage(null)

		try {
			// Step 1: Create Confirmation Token (Stripe's 2025 recommended approach)
			const { error: confirmationError, confirmationToken } =
				await stripe.createConfirmationToken({
					elements,
					params: {
						payment_method_data: {
							billing_details: {
								// Payment Element automatically collects billing details
								// No need for custom billing name field
							}
						}
					}
				})

			if (confirmationError) {
				setErrorMessage(
					confirmationError.message || 'Payment validation failed'
				)
				return
			}

			// Step 2: Send Confirmation Token to server to create and confirm subscription
			const response = await post<{
				subscription: { id: string; status: string }
				clientSecret?: string
				requiresAction?: boolean
			}>('/api/stripe/create-subscription', {
				confirmationTokenId: confirmationToken.id,
				planType,
				billingInterval: billingInterval === 'annual' ? 'year' : 'month'
			})

			// Step 3: Handle any additional actions (3D Secure, etc.)
			if (response.requiresAction && response.clientSecret) {
				const { error: actionError } = await stripe.handleNextAction({
					clientSecret: response.clientSecret
				})

				if (actionError) {
					setErrorMessage(
						actionError.message || 'Payment authentication failed'
					)
					return
				}
			}

			// Step 4: Success!
			setIsSuccess(true)
			onSuccess?.(response.subscription.id)
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

	// Show success state
	if (isSuccess) {
		return (
			<Card className="mx-auto w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="flex items-center justify-center gap-2 text-green-6">
						<i className="i-lucide-checkcircle h-6 w-6"  />
						Subscription Activated!
					</CardTitle>
					<CardDescription>
						Welcome to {plan?.name}! Your subscription is now
						active.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center">
					<p className="text-muted-foreground mb-4 text-sm">
						You'll receive a confirmation email shortly with your
						subscription details.
					</p>
					<Button
						onClick={() => (window.location.href = '/dashboard')}
						className="w-full"
					>
						Continue to Dashboard
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="flex items-center justify-center gap-2">
					<i className="i-lucide-credit-card h-5 w-5"  />
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
					<div className="mt-2 flex items-center justify-center gap-1">
						<i className="i-lucide-shield h-4 w-4"  />
						<span>Secure checkout powered by Stripe</span>
					</div>
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form
					onSubmit={e => void handleSubmit(e)}
					className="space-y-6"
				>
					{/* Enhanced Payment Element - Uses Stripe's native billing collection */}
					<div className="border-border bg-card rounded-xl border p-6 shadow-sm">
						<PaymentElement
							options={{
								// Layout configuration for optimal UX
								layout: {
									type: 'tabs',
									defaultCollapsed: false,
									spacedAccordionItems: true
								},
								// Native billing details collection (replaces custom fields)
								fields: {
									billingDetails: {
										name: 'auto', // Stripe handles name collection
										email: 'auto', // Stripe handles email collection
										phone: 'never', // Don't collect phone for subscriptions
										address: {
											country: 'auto', // Required for tax calculation
											postalCode: 'auto' // Required for card validation
										}
									}
								},
								// Terms and conditions display
								terms: {
									card: 'auto',
									applePay: 'auto',
									googlePay: 'auto'
								},
								// Digital wallet configuration
								wallets: {
									applePay: 'auto',
									googlePay: 'auto'
								},
								// Business context for better conversion
								business: {
									name: 'TenantFlow'
								},
								// Optimized payment method order
								paymentMethodOrder: [
									'card',
									'apple_pay',
									'google_pay',
									'link', // Stripe Link for returning customers
									'paypal'
								]
							}}
						/>
					</div>

					{/* Error message */}
					{errorMessage && (
						<Alert variant="destructive">
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
					)}

					{/* Action buttons */}
					<div className="flex gap-3">
						{onCancel && (
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isProcessing}
								className="flex-1"
							>
								Cancel
							</Button>
						)}

						<Button
							type="submit"
							disabled={!stripe || isProcessing}
							className="bg-gradient-steel-soft hover:bg-gradient-steel-deep flex-1 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
							size="lg"
						>
							{isProcessing ? (
								<>
									<i className="i-lucide-loader-2 mr-2 h-4 w-4 animate-spin"  />
									Processing...
								</>
							) : (
								`Subscribe for $${price}/${billingInterval === 'annual' ? 'year' : 'month'}`
							)}
						</Button>
					</div>

					{/* Enhanced security indicators */}
					<div className="space-y-2 text-center">
						<div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
							<i className="i-lucide-shield h-4 w-4"  />
							<span>
								256-bit SSL encryption • PCI DSS compliant
							</span>
						</div>
						<p className="text-muted-foreground text-xs">
							Your payment information is processed securely by
							Stripe.
							<br />
							We don't store your payment details.
						</p>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
